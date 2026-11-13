# effect-microvm

Effect microVMs: the microsandbox binding, the daemon microVM medium, and the private microVM test images.

Extracted from `systemfsoftware/systemfsoftware` (core); package history came with the move.

## Packages

| Package                                  | Version | Distributed  |
| ---------------------------------------- | ------- | ------------ |
| `@systemfsoftware/effect-microsandbox`   | 6.0.0   | yes          |
| `@systemfsoftware/effect-daemon-microvm` | 2.0.0   | yes          |
| `@systemfsoftware/microvm-test-images`   | 0.1.0   | no (private) |

## Dependencies on core

https://nix.systemfsoftware.com is the package registry for `@systemfsoftware` packages: a producer pushes its package tarballs there from `main`, a consumer substitutes them through its flake inputs, and nothing is published to npm.

`flake.nix` pins core, `effect-readiness` and `effect-daemon` at full commits (inputs `core`, `effect-readiness` and `effect-daemon`). `lib.mkProducerTarballs` lays their tarballs under `.deps/`, and `pnpm-workspace.yaml` maps each package to `file:.deps/<name>.tgz` through `overrides`. `effect-daemon` does not push to the registry yet, so its two tarballs (`effect-daemon-spec` and `effect-daemon-conformance`) build from source on a cold setup until it does. To take newer packages: bump the input, regenerate the overrides with `nix eval --raw .#producer-tarballs.overrides`, then run `pnpm update '@systemfsoftware/*'`.

Local setup:

```bash
nix develop
pnpm install
```

## Release

`release.jsonc` and `.github/workflows/release.yml` run pnpm-release-management's release flow: intents in `.changeset/`
become a version PR, and merging it tags `<pkg>@vX.Y.Z` and creates GitHub Releases. The Version column is the version the manifest declares. A manifest at a version no tag covers is owed that tag ahead of any
pending intent, and its GitHub Release reads that version's `CHANGELOG.md` section, so such a version needs its section written.

## Gate

- `pnpm check:local` before delivery: dprint, build, lint, typecheck, type tests, API reports, attw, tests at the
  local conformance profile.
- CI (`.github/workflows/ci.yml`) is one `checks` job from the shared reusable workflow at a pinned commit. A pull
  request runs `pnpm check:static`. A Mergify queue draft (`mergify/merge-queue/*`) and main run `pnpm check:ci`, the
  static checks plus every package's whole suite, with KVM granted. The squash-message lint and the change-intent check
  are steps of the same job. On main, the effect-microsandbox smoke journeys also run. `nix.yml` builds the flake
  outputs on main only.
- Never start a local mutation run; mutation runs in CI only.
- Version bumps: every change to a publishable package's packed output advances its version at least a patch.

## Conventions

- Run `pnpm --filter <pkg> <cmd>` from the root; never `cd` into packages, never `npx`.
- Commits: `type(scope): subject` (commitlint).
- Tooling scripts are TypeScript run by the toolchain already in the workspace; no synchronous IO in new scripts.

## Routing

| Doc                                 | Trigger                                                                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONSTITUTION.md`                   | architecture changes, rule authoring, or design disputes                                                                                        |
| `repos/constitution/ENFORCEMENT.md` | building or changing an instrument that grades work (lint gates, stream rules, CI checks, thresholds, rubrics, advisors); situational read only |
