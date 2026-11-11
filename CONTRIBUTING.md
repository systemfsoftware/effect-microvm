# Contributing

## Prerequisites

- A supported system: the flake builds only on `x86_64-linux` and `aarch64-linux`.
- Nix with flakes, for `nix develop`. The dev shell provides Node.js 24, pnpm 12 and dprint.
- Hardware virtualization with KVM access, only for the smoke journey and the integration tests that boot a guest.

## Setup

```sh
nix develop
```

The core packages come from the pinned `core` input in `flake.nix`. Follow the setup there before running `pnpm install`.

Run pnpm commands from the repository root with a filter, for example `pnpm --filter @systemfsoftware/effect-microsandbox <script>`.

## Checks

Before you open a pull request, run the full local gate:

```sh
pnpm check:local
```

It runs dprint, build, lint, typecheck, type tests, API reports, attw and the tests at the local conformance profile.

To boot a real guest on a KVM host, run the smoke journey:

```sh
pnpm --filter @systemfsoftware/effect-microsandbox smoke:journey
```

Mutation testing runs in CI only. Do not start a mutation run locally.

The private `@systemfsoftware/microvm-test-images` package holds the pinned OCI image references that the checks use.

## Pull requests

- Commit messages follow `type(scope): subject`, checked by commitlint.
- Every change to a publishable package's packed output advances that package's version by at least a patch.
- CI runs the static checks and the affected tests on each pull request, and every package's full suite on `main`.
