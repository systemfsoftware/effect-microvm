# effect-microvm

Effect libraries for declaring microVM-backed workloads and supervising them with a daemon. The repository contains the microsandbox binding, the daemon medium, and the image references used by their checks.

## Packages

| Package                                                                     | Purpose                                                         | npm release | Main manifest |
| --------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------- | ------------- |
| [`@systemfsoftware/effect-microsandbox`](packages/effect-microsandbox/)     | Declare and run microVM workloads through Effect scopes.        | `5.0.0`     | `5.1.2`       |
| [`@systemfsoftware/effect-daemon-microvm`](packages/effect-daemon-microvm/) | Supervise workloads using a microVM medium.                     | `1.0.0`     | `1.0.3`       |
| [`@systemfsoftware/microvm-test-images`](packages/microvm-test-images/)     | Share pinned OCI image references for this repository's checks. | Private     | `0.1.0`       |

The npm and main versions above describe different artifacts. The main versions are not available as npm releases. Check the [npm microsandbox package](https://www.npmjs.com/package/@systemfsoftware/effect-microsandbox) and [npm daemon package](https://www.npmjs.com/package/@systemfsoftware/effect-daemon-microvm) for current releases.

## Install

In an empty consumer directory with npm and Bun installed, install the published packages with the Effect dependency versions used in the example:

```bash
npm install @systemfsoftware/effect-microsandbox@5.0.0 @systemfsoftware/effect-daemon-microvm@1.0.0 effect@4.0.5 @effect/platform-node@4.0.5 @effect/platform-node-shared@4.0.5
```

The pins matter for these releases: resolving Effect `4.1.2` caused the microsandbox import to fail because `effect/Crypto` was not found. The example below was run with Node `24.21.0`, npm `11.19.0`, and Bun `1.4.2` on Linux x64.

## Usage

Save this as `example.mjs`:

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

This constructs a specification and checks the package exports; it does **not** boot a microVM. Both the published `5.0.0` artifact and current main expose `MicroVM.exec`. The published microsandbox README shows `vm.exec`; use the artifact's exported API instead.

## Running a microVM

Running a guest requires hardware virtualization. On Linux, the process needs access to KVM. The repository's [smoke journey](packages/effect-microsandbox/examples/boot-alpine.ts) exercises guest execution, port mapping, and cleanup on a suitable host; the import example above is not evidence that those operations ran.

## Source and support

The [microsandbox source](packages/effect-microsandbox/src/) and [daemon medium source](packages/effect-daemon-microvm/src/MicroVMMedium/) describe the unreleased main implementation. Report problems in the [issue tracker](https://github.com/systemfsoftware/effect-microvm/issues).

## License

The packages declare Apache-2.0; see the [daemon package license](packages/effect-daemon-microvm/LICENSE).
