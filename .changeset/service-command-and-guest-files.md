---
"@systemfsoftware/effect-microsandbox": minor
---

A service can now run a command in the guest and have files in it before it is ready, with no host-path mount.

- `MicroVM.withCommand(argv)` sets the command a service starts after boot and before its readiness wait. On a job it replaces the job's command. `ServiceSpec` gains an optional `cmd`.
- `MicroVM.withFiles(files)` merges files into the guest before it boots. `files` maps an absolute guest path to its content, a string or `Uint8Array`, and a later entry for the same path wins. Service and job specs gain an optional `files`, and `MicroVM.GuestFiles` is exported.
- A service command that cannot be launched fails the boot with `ExecError`.
