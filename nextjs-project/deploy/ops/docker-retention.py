#!/usr/bin/env python3
"""Project-scoped image retention and verified PostgreSQL backup rotation."""

import argparse
import datetime
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile


REPOSITORIES = ("nextjs-project-app", "nextjs-project-bot")
KEEP = 2


def log(message):
    print(message, flush=True)


def docker(*args, **kwargs):
    return subprocess.run(["docker", *args], check=True, timeout=300, **kwargs)


def inspect_images(ids):
    if not ids:
        return []
    return json.loads(docker("image", "inspect", *ids, capture_output=True, text=True).stdout)


def container_images():
    # Include stopped containers: never break an existing container's restart.
    ids = docker("container", "ls", "--all", "--quiet", capture_output=True, text=True).stdout.split()
    if not ids:
        return []
    lines = docker("container", "inspect", "--format", "{{.Image}} {{.Config.Image}}", *ids,
                   capture_output=True, text=True).stdout.splitlines()
    return [line.split(maxsplit=1) for line in lines]


def referenced_images():
    return {identifier for identifier, _ in container_images()}


def image_repository(tag):
    return tag.rsplit(":", 1)[0]


def removable(image, referenced):
    tags = image.get("RepoTags") or []
    return (
        image["Id"] not in referenced
        and bool(tags)
        and all(image_repository(tag) in REPOSITORIES and not tag.endswith(":latest") for tag in tags)
    )


def plan_images(images, referenced):
    candidates = {image["Id"]: image for image in images if removable(image, referenced)}
    keep = set()
    for repository in REPOSITORIES:
        ordered = sorted(
            (image for image in candidates.values()
             if any(image_repository(tag) == repository for tag in image["RepoTags"])),
            key=lambda image: (image["Created"], image["Id"]), reverse=True,
        )
        keep.update(image["Id"] for image in ordered[:KEEP])
    return [image for image in candidates.values() if image["Id"] not in keep]


def prune_images(dry_run):
    ids = docker("image", "ls", "--quiet", "--no-trunc", capture_output=True, text=True).stdout.split()
    images = inspect_images(list(dict.fromkeys(ids)))
    for image in plan_images(images, referenced_images()):
        # Recheck after planning; no force, no global image/container/volume prune.
        current = inspect_images([image["Id"]])[0]
        if not removable(current, referenced_images()):
            log(f"KEEP changed/in-use image {image['Id']}")
            continue
        for tag in current["RepoTags"]:
            log(f"{'WOULD REMOVE' if dry_run else 'REMOVE'} image {tag}")
            if not dry_run:
                if inspect_images([tag])[0]["Id"] != image["Id"]:
                    raise RuntimeError(f"Image tag changed during retention: {tag}")
                docker("image", "rm", tag)
    log("Image retention complete: latest, referenced images and two previous images per service kept")


def snapshot_images():
    # Call under the deployment lock, BEFORE building/replacing :latest.
    # Use each container's actual ID even if a manual build has moved :latest.
    for identifier, configured_image in sorted(set(map(tuple, container_images()))):
        repository = image_repository(configured_image)
        if repository in REPOSITORIES:
            tag = f"{repository}:rollback-{identifier.split(':')[1][:12]}"
            docker("image", "tag", identifier, tag)
            log(f"Saved rollback image {tag}")


def backup_files(directories):
    files = []
    for directory in directories:
        if directory.is_symlink():
            raise RuntimeError(f"Refusing symlink backup directory: {directory}")
        if not directory.exists():
            continue
        for path in directory.iterdir():
            if (not path.is_symlink() and path.is_file() and path.suffix == ".dump"
                    and path.name.startswith(("innerhealth-", "before-"))):
                files.append(path)
    return sorted(files, key=lambda path: (path.stat().st_mtime_ns, path.name), reverse=True)


def validate_backup(path, container):
    if path.stat().st_size == 0:
        raise RuntimeError(f"Empty backup: {path}")
    for args in (("--list",), ("--file=/dev/null",)):
        with path.open("rb") as source:
            docker("exec", "-i", container, "pg_restore", *args,
                   stdin=source, stdout=subprocess.DEVNULL)


def rotate_backups(directories, container):
    files = backup_files(directories)
    # Validate BOTH retained dumps before deleting any older recovery point.
    for path in files[:KEEP]:
        validate_backup(path, container)
    for path in files[KEEP:]:
        log(f"REMOVE backup {path}")
        path.unlink()
    log(f"Backup retention complete: {len(files[:KEEP])} verified dumps kept")


def backup_database(dry_run):
    directory = Path(os.environ.get("BACKUP_DIR", "/home/user1/innerhealth-backups"))
    legacy = Path(os.environ.get("LEGACY_BACKUP_DIR", "/opt/innerhealth/backups"))
    directories = list(dict.fromkeys((directory, legacy)))
    container = os.environ.get("DB_CONTAINER", "nextjs-project-db-1")
    if dry_run:
        files = backup_files(directories)
        log(f"WOULD create and verify PostgreSQL dump in {directory}, then keep two freshest verified dumps")
        for path in files[KEEP - 1:]:
            log(f"WOULD REMOVE backup after successful new dump: {path}")
        return
    if directory.is_symlink():
        raise RuntimeError(f"Refusing symlink backup directory: {directory}")
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    stamp = datetime.datetime.now().astimezone().strftime("%Y%m%d-%H%M%S-%f")
    target = directory / f"innerhealth-{stamp}.dump"
    descriptor, temporary = tempfile.mkstemp(prefix=".innerhealth-", suffix=".partial", dir=directory)
    partial = Path(temporary)
    try:
        with os.fdopen(descriptor, "wb") as output:
            docker("exec", container, "sh", "-c",
                   'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --lock-wait-timeout=30s',
                   stdout=output)
            output.flush()
            os.fsync(output.fileno())
        validate_backup(partial, container)
        if os.geteuid() == 0:
            owner = directory.stat()
            os.chown(partial, owner.st_uid, owner.st_gid)
        partial.rename(target)
        log(f"Created verified backup {target} ({target.stat().st_size} bytes)")
    finally:
        partial.unlink(missing_ok=True)
    rotate_backups(directories, container)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("images", "backups", "snapshot"))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.action == "images":
        prune_images(args.dry_run)
    elif args.action == "backups":
        backup_database(args.dry_run)
    elif args.dry_run:
        parser.error("snapshot does not support --dry-run")
    else:
        snapshot_images()


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, subprocess.SubprocessError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
