# Contributing

Thanks for considering a contribution.

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Before Opening a Pull Request

Please make sure your change:

- keeps the app runnable with `npm run dev`
- passes `npm test`
- passes `npm run build`
- includes tests when logic changes are substantial
- updates documentation when behavior or setup changes

## Pull Request Tips

- Keep PRs focused and reasonably small.
- Describe the user-facing impact and any tradeoffs.
- Include screenshots when UI behavior changes.
- Mention any exchange API assumptions or known data limitations.

## Code Style

- TypeScript is the default for application and server code.
- Prefer small, readable functions over deeply nested logic.
- Reuse shared types and helpers from `src/shared/` when possible.

## Reporting Issues

When filing a bug, include:

- what you expected to happen
- what actually happened
- steps to reproduce
- screenshots if the issue is visual
- console or terminal errors if available
