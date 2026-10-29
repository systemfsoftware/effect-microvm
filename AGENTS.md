# effect-microvm

Effect microVMs: the microsandbox binding, the daemon microVM medium, and the private microVM test images.

Extracted from `systemfsoftware/systemfsoftware` (core); package history came with the move.

## Packages

| Package                                  | Version | Distributed  |
| ---------------------------------------- | ------- | ------------ |
| `@systemfsoftware/effect-microsandbox`   | 5.1.2   | yes          |
| `@systemfsoftware/effect-daemon-microvm` | 1.0.3   | yes          |
| `@systemfsoftware/microvm-test-images`   | 0.1.0   | no (private) |

Transitional: `effect-readiness`, `effect-daemon-spec` and `effect-daemon-conformance` still come from the core pin; once their own repositories ship tarballs, add those flakes as producers in `flake.nix`.

## Dependencies on core

Core packages are not installed from a registry. `flake.nix` pins core at a full commit (input `core`) and
`nix build .#sfs-deps` links the core tarballs this lockfile names. `pnpm-workspace.yaml` maps every core package
(and its transitive core closure) to `file:.sfs-deps/<name>-<version>.tgz` through `overrides`; the moved manifests
name ordinary semver ranges. To take newer core packages: bump the `core` input, update the override versions,
rebuild `.sfs-deps`, run `pnpm install`.

Local setup:

```bash
mkdir -p .sfs-deps && cp -L --no-preserve=mode "$(nix build --no-link --print-out-paths .#sfs-deps)"/*.tgz .sfs-deps/
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
