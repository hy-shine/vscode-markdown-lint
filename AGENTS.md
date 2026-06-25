# AGENTS.md

## Project Overview

VS Code Markdown preview extension. Package name `markdown-lint`, display name `Markdown Preview Lite`. Originally a lint tool, repositioned as a previewer since 0.5.0. Extension ID, command IDs, and `markdown-lint.*` config namespace are preserved for Marketplace compatibility.

## Build & Development Commands

| Command | Description |
|---|---|
| `make install` | Install dependencies (`npm ci`) |
| `make build` | Bundle to `dist/extension.js` via esbuild |
| `make watch` | Watch mode |
| `make test` | Run unit tests (`node --test --import tsx`) |
| `make clean` | Remove `dist/` and `.vsix` files |
| `make package` | Build + generate `.vsix` |
| `make publish` | Build + publish to Marketplace |

## Architecture

- **Host vs Webview**: `src/` runs in Extension Host (Node.js), `media/` runs in Webview (browser)
- **Pure/Impure separation**: `*Pure.ts` files have zero VS Code dependency and are directly testable with `node:test`; non-Pure files inject side effects
- **Message protocol**: Host→Webview (`render`, `scrollToLine`, `scrollToAnchor`); Webview→Host (config changes, navigation, export, format)
- **Directory layout**: `src/core/` (pure logic + impure adapters), `src/preview/` (webview panel manager), `src/formatting/` (formatting provider), `media/` (webview CSS/JS), `test/` (unit tests)

## Engineering Principles

- **Think before coding**: State assumptions explicitly. If multiple interpretations exist, present them. If a simpler approach exists, say so. Stop and ask when unclear.
- **Simplicity first**: Minimum code that solves the problem. No features beyond what was asked. No abstractions for single-use code. If 200 lines could be 50, rewrite.
- **Surgical changes**: Touch only what is necessary. Match existing style. Don't refactor unrelated code. Every changed line should trace to the request. Remove only orphans your changes created.
- **Goal-driven execution**: Define success criteria before starting. For multi-step tasks, state a brief plan with verification checks. Loop until verified.

## Code Conventions

- TypeScript strict mode, ES2022 target, CJS output via esbuild
- No comments unless explicitly requested
- Test files in `test/`, named `*.test.ts`
- CSS in `media/main.css`, JS in `media/*.js` — no frameworks
- Commit messages: Conventional Commits format (`feat(scope):`, `fix(scope):`, `refactor(scope):`, `perf(scope):`, `chore(scope):`, `style(scope):`)

## Key Constraints

- Never change extension ID, command IDs, or `markdown-lint.*` config namespace
- `*Pure.ts` files must not import `vscode`
- Webview CSP uses nonce — no inline scripts
- Export CDN versions must stay in sync with `package.json` dependencies
- Run `make test` before considering work complete
- Never commit `dist/`, `.vsix` files, or `node_modules/`

## Release Checklist

- Update `package.json` version
- Update `CHANGELOG.md` (merge similar items, keep concise)
- Run `make test` — all tests must pass
- Run `make package` — verify `.vsix` generates
- Do not commit unless explicitly asked
