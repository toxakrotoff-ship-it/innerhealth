# Contributing to InnerHealth

Thank you for your interest in improving InnerHealth. This project is an open-source multi-brand e-commerce starter built with Next.js, TypeScript, Prisma, and PostgreSQL.

## Reporting issues

1. Search [existing issues](https://github.com/toxakrotoff-ship-it/innerhealth/issues) to avoid duplicates.
2. Open a new issue with a clear title and reproduction steps when possible.
3. Include environment details (Node.js version, OS) and relevant logs or screenshots for UI problems.
4. Do not include secrets, `.env` values, API keys, or production credentials in issues.

## Proposing changes

1. Fork the repository and create a branch from `main`.
2. Keep pull requests focused: one logical change per PR when possible.
3. Describe what changed, why, and how you tested it.
4. Link related issues when applicable.

## Before opening a PR

Run checks from `nextjs-project` when your change touches application code:

```bash
cd nextjs-project
npm run lint
```

If the project adds or documents a typecheck script, run it as well:

```bash
npm run typecheck
```

Run tests when your change affects behavior covered by tests:

```bash
npm test
```

Fix lint or type errors introduced by your change. If unrelated failures already exist on `main`, mention them in the PR description.

## Security and secrets

- Never commit `.env`, tokens, passwords, or private keys.
- Use `.env.example` and documentation as references only.
- Report security vulnerabilities privately — see [SECURITY.md](./SECURITY.md).

## Documentation changes

- Update user-facing docs when behavior or configuration changes.
- Prefer small, accurate edits over large rewrites unless necessary.
- Do not add unverified metrics, user counts, or roadmap deadlines.

## Code review expectations

Maintainers review PRs when available. There is no guaranteed response time. Smaller, well-described changes are easier to review and merge.

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](./LICENSE).
