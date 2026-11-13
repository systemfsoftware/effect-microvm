# @systemfsoftware/effect-microsandbox

## 6.1.0

Requires Effect ^4.1.2. Released as 6.0.0 and 2.0.0; their changelogs carry the entry.

A service can now run a command in the guest and have files in it before it is ready, with no host-path mount.

- `MicroVM.withCommand(argv)` sets the command a service starts after boot and before its readiness wait. On a job it replaces the job's command. `ServiceSpec` gains an optional `cmd`.
- `MicroVM.withFiles(files)` merges files into the guest before it boots. `files` maps an absolute guest path to its content, a string or `Uint8Array`, and a later entry for the same path wins. Service and job specs gain an optional `files`, and `MicroVM.GuestFiles` is exported.
- A service command that cannot be launched fails the boot with `ExecError`.

## 6.0.0

Random bytes come from `effect/crypto/SecureRandom`, so this package no longer imports `effect/Crypto`; effect 4.1.0 removed that module, and every earlier release fails with `ERR_MODULE_NOT_FOUND` on effect 4.1. The service the package requires changes from `Crypto` to `SecureRandom`: provide it with `NodeCrypto.layerSecureRandom` from `@effect/platform-node/NodeCrypto`. The `effect` peer range is `^4.1.2`.

This is the first release made from `systemfsoftware/effect-microvm`. The last tags, `@v5.1.1` and `@v1.0.2` in the core repository, predate the move.
