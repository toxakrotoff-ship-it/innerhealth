"""Safety checks for automatic deletion; runs without Docker or production data."""

import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("retention", Path(__file__).with_name("docker-retention.py"))
retention = importlib.util.module_from_spec(spec)
spec.loader.exec_module(retention)


def image(identifier, created, *tags):
    return {"Id": identifier, "Created": created, "RepoTags": list(tags)}


class ImageRetentionTests(unittest.TestCase):
    def test_snapshot_saves_container_image_even_when_it_has_no_tags(self):
        with patch.object(retention, "container_images", return_value=[
            ("sha256:abcdef1234560000", "nextjs-project-app:latest"),
            ("sha256:db00000000000000", "postgres:16-alpine"),
        ]), patch.object(retention, "docker") as docker:
            retention.snapshot_images()
        docker.assert_called_once_with("image", "tag", "sha256:abcdef1234560000",
                                       "nextjs-project-app:rollback-abcdef123456")

    def test_keeps_two_distinct_rollbacks_plus_latest_referenced_and_other_repositories(self):
        images = [
            image("live", "2026-10-27", "nextjs-project-app:latest", "nextjs-project-app:rollback-live"),
            image("r1", "2026-10-26", "nextjs-project-app:before-one", "nextjs-project-app:rollback-one"),
            image("r2", "2026-10-25", "nextjs-project-app:before-two"),
            image("old", "2026-10-24", "nextjs-project-app:before-three"),
            image("stopped", "2026-10-23", "nextjs-project-app:before-stopped"),
            image("bot-live", "2026-10-27", "nextjs-project-bot:latest"),
            image("b1", "2026-10-26", "nextjs-project-bot:rollback-one"),
            image("b2", "2026-10-25", "nextjs-project-bot:rollback-two"),
            image("b3", "2026-10-24", "nextjs-project-bot:rollback-three"),
            image("db", "2026-01-01", "postgres:16-alpine"),
            image("migrator", "2026-01-01", "nextjs-project-migrator:latest"),
            image("shared", "2026-01-01", "nextjs-project-app:shared", "another-project:saved"),
            image("dangling", "2026-01-01"),
        ]
        planned = retention.plan_images(images, {"live", "stopped", "bot-live", "db"})
        self.assertEqual({item["Id"] for item in planned}, {"old", "b3"})

    def test_dry_run_cannot_delete_tags(self):
        images = [image(str(i), f"2026-10-{i:02}", f"nextjs-project-app:before-{i}") for i in range(1, 5)]
        with patch.object(retention, "docker") as docker, \
                patch.object(retention, "inspect_images", side_effect=[images, images[0:1], images[1:2]]), \
                patch.object(retention, "referenced_images", return_value=set()):
            docker.return_value.stdout = "1 2 3 4"
            retention.prune_images(True)
            self.assertFalse(any(call.args[:2] == ("image", "rm") for call in docker.call_args_list))

    def test_image_referenced_after_planning_is_kept(self):
        images = [image(str(i), f"2026-10-{i:02}", f"nextjs-project-app:before-{i}") for i in range(1, 4)]
        with patch.object(retention, "docker") as docker, \
                patch.object(retention, "inspect_images", side_effect=[images, images[0:1]]), \
                patch.object(retention, "referenced_images", side_effect=[set(), {"1"}]):
            docker.return_value.stdout = "1 2 3"
            retention.prune_images(False)
            self.assertFalse(any(call.args[:2] == ("image", "rm") for call in docker.call_args_list))


class BackupRetentionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.legacy = self.root / "legacy"
        self.current = self.root / "current"
        self.legacy.mkdir()
        self.current.mkdir()
        self.files = []
        for number, directory in enumerate((self.legacy, self.current, self.current)):
            path = directory / f"innerhealth-{number}.dump"
            path.write_bytes(b"fixture")
            retention.os.utime(path, (number + 1, number + 1))
            self.files.append(path)

    def test_rotates_across_directories_only_after_both_retained_dumps_validate(self):
        unrelated = self.legacy / "other-service.dump"
        unrelated.write_bytes(b"keep")
        link = self.current / "before-link.dump"
        link.symlink_to(self.files[0])
        with patch.object(retention, "validate_backup") as validate:
            retention.rotate_backups([self.legacy, self.current], "db")
            self.assertEqual([call.args[0] for call in validate.call_args_list], self.files[:0:-1])
        self.assertFalse(self.files[0].exists())
        self.assertTrue(all(path.exists() for path in self.files[1:]))
        self.assertTrue(unrelated.exists())
        self.assertTrue(link.is_symlink())

    def test_invalid_retained_backup_prevents_all_deletion(self):
        with patch.object(retention, "validate_backup", side_effect=[None, RuntimeError("corrupt")]):
            with self.assertRaisesRegex(RuntimeError, "corrupt"):
                retention.rotate_backups([self.legacy, self.current], "db")
        self.assertTrue(all(path.exists() for path in self.files))

    def test_failed_dump_preserves_existing_backups_and_cleans_partial(self):
        with patch.dict(retention.os.environ, {"BACKUP_DIR": str(self.current), "LEGACY_BACKUP_DIR": str(self.legacy)}), \
                patch.object(retention, "docker", side_effect=RuntimeError("dump failed")):
            with self.assertRaisesRegex(RuntimeError, "dump failed"):
                retention.backup_database(False)
        self.assertTrue(all(path.exists() for path in self.files))
        self.assertEqual(set(self.current.iterdir()), set(self.files[1:]))

    def test_dry_run_never_creates_or_deletes_backups(self):
        with patch.dict(retention.os.environ, {"BACKUP_DIR": str(self.current), "LEGACY_BACKUP_DIR": str(self.legacy)}), \
                patch.object(retention, "docker") as docker:
            retention.backup_database(True)
        docker.assert_not_called()
        self.assertTrue(all(path.exists() for path in self.files))


if __name__ == "__main__":
    unittest.main()
