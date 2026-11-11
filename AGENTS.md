# effect-microvm

Effect microVMs: the microsandbox binding, the daemon microVM medium, and the private microVM test images.

Extracted from `systemfsoftware/systemfsoftware` (core); package history came with the move.

## Packages

| Package                                  | Version | Distributed    |
| ---------------------------------------- | ------- | -------------- |
| `@systemfsoftware/effect-microsandbox`   | 5.1.2   | yes (registry) |
| `@systemfsoftware/effect-daemon-microvm` | 1.0.3   | yes (registry) |
| `@systemfsoftware/microvm-test-images`   | 0.1.0   | no (private)   |

## Dependencies on core

https://nix.systemfsoftware.com is the package registry for `@systemfsoftware` packages: a producer pushes its package tarballs there from `main`, a consumer substitutes them through its flake inputs, and nothing is published to npm.

`flake.nix` pins core, `effect-readiness` and `effect-daemon` at full commits (inputs `core`, `effect-readiness` and `effect-daemon`). `lib.mkProducerTarballs` lays their tarballs under `.deps/`, and `pnpm-workspace.yaml` maps each package to `file:.deps/<name>.tgz` through `overrides`. `effect-daemon` does not push to the registry yet, so its two tarballs (`effect-daemon-spec` and `effect-daemon-conformance`) build from source on a cold setup until it does. To take newer packages: bump the input, regenerate the overrides with `nix eval --raw .#producer-tarballs.overrides`, then run `pnpm update '@systemfsoftware/*'`.

Local setup:

```bash
nix develop
pnpm install
```

## Gate

- `pnpm check:local` before delivery: dprint, build, lint, typecheck, type tests, API reports, attw, tests at the
  local conformance profile.
- CI (`.github/workflows/ci.yml`) calls core's reusable checks at a pinned core commit. A pull request (and a
  merge-queue draft) runs the static lane and the affected tests (`.github/ci/pr-tests.mjs`: `turbo --affected`,
  `vitest --changed`, plus any `test:integration` file it touches) and no packed test job; main runs every package's
  whole suite at the per-change profile, effect-daemon-microvm's `test:integration` and the effect-microsandbox smoke
  journeys, with KVM granted. `nix.yml` builds the flake outputs on main only.
- Never start a local mutation run; mutation runs in CI only.
- Version bumps: every change to a publishable package's packed output advances its version at least a patch.

## Conventions

- Run `pnpm --filter <pkg> <cmd>` from the root; never `cd` into packages, never `npx`.
- Commits: `type(scope): subject` (commitlint).
- Tooling scripts are TypeScript run by the toolchain already in the workspace; no synchronous IO in new scripts.
