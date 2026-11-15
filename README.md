# effect-microvm

Effect libraries for declaring microVM-backed workloads and supervising them. `effect-microsandbox` declares a microVM and runs it inside an Effect scope. `effect-daemon-microvm` runs microVM workloads as children of an [effect-daemon](https://github.com/systemfsoftware/effect-daemon) supervision tree.

## Packages

| Package                                  | What it is                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `@systemfsoftware/effect-microsandbox`   | Declare microVM workloads and run them through Effect scopes, on the microsandbox runtime. |
| `@systemfsoftware/effect-daemon-microvm` | A daemon medium that supervises workloads running in microVMs.                             |

## Install

```sh
pnpm add @systemfsoftware/effect-microsandbox @systemfsoftware/effect-daemon-microvm effect@^4.1.2 typescript@">=7.0.0"
```

`effect` and `typescript` are peer dependencies: the packages declare them but do not install them, so one copy is shared with the rest of your project. Install only the package you use; `@systemfsoftware/effect-daemon-microvm` depends on `@systemfsoftware/effect-microsandbox`.

## Usage

Save this as `example.mjs` in a project that installs both packages:

```js
import { MicroVMMedium } from '@systemfsoftware/effect-daemon-microvm'
import { MicroVM } from '@systemfsoftware/effect-microsandbox'

const alpine = MicroVM.spec('alpine:3.20')
console.log('image:', alpine.spec.image)
console.log('microVM exec:', typeof MicroVM.exec)
console.log('daemon medium:', typeof MicroVMMedium.layer)
```

Run it:

```bash
bun run example.mjs
```

Output:

```text
image: alpine:3.20
microVM exec: function
daemon medium: function
```

This builds a specification and checks the exports. It does **not** boot a microVM.

## Running a microVM

Running a guest requires hardware virtualization. On Linux, the process needs access to KVM. The repository's [smoke journey](packages/effect-microsandbox/examples/boot-alpine.ts) exercises guest execution, port mapping and cleanup on a suitable host. The import example above is not evidence that those operations work on your machine.

## Support

Report problems in the [issue tracker](https://github.com/systemfsoftware/effect-microvm/issues).

## Contributing

Development setup and checks are in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache-2.0. See [the daemon package's LICENSE](packages/effect-daemon-microvm/LICENSE).
