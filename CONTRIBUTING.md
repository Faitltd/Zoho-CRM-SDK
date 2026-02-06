# Contributing

Thanks for your interest in contributing to the Zoho CRM TypeScript SDK! This project is early (0.x), so feedback and small improvements are especially valuable.

## Getting Started

1. Clone the repo:
   ```bash
   git clone <your-fork-url>
   cd zcrm-nodejs-sdk-master
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Development Scripts

- Lint:
  ```bash
  npm run lint
  ```
- Tests:
  ```bash
  npm test
  ```
- Build:
  ```bash
  npm run build
  ```
- Run an example:
  ```bash
  npx ts-node examples/basic-auth.ts
  ```

## Coding Style

- TypeScript `strict` is required.
- Use Biome for formatting and linting.
- Prefer small, focused changes and add tests when behavior changes.

## Proposing Changes

- **Bugs**: open an issue with reproduction steps and expected behavior.
- **Features**: open an issue describing the use case, not just the API shape.
- **PRs**: keep scope tight, reference issues when possible, and include tests.

## Notes on Stability

This SDK is 0.x. APIs may change as we gather real-world feedback. Backwards compatibility is a goal, but not guaranteed until 1.0.
