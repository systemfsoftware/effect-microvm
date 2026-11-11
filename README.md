# effect-microvm

Effect libraries for declaring microVM-backed workloads and supervising them. `effect-microsandbox` declares a microVM and runs it inside an Effect scope. `effect-daemon-microvm` runs microVM workloads as children of an [effect-daemon](https://github.com/systemfsoftware/effect-daemon) supervision tree.

## Packages

| Package                                  | What it is                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `@systemfsoftware/effect-microsandbox`   | Declare microVM workloads and run them through Effect scopes, on the microsandbox runtime. |
| `@systemfsoftware/effect-daemon-microvm` | A daemon medium that supervises workloads running in microVMs.                             |

## Install

`@systemfsoftware` packages are distributed as Nix tarballs from `nix.systemfsoftware.com`, not from npm, so do not run `npm install` or `pnpm add` for them. Take them through a flake. Third-party peers such as `effect` install from npm as usual.

Add the producer as a flake input in your project's `flake.nix`. Pin it to a full commit SHA or a release tag:

```nix
{
  nixConfig = {
    extra-substituters = "https://nix.systemfsoftware.com";
    extra-trusted-public-keys = "nix-cache-1:wXA8I4DayNW9q6enUyQA/P/nT38pGSTLt374t3gsn7M=";
    fallback = true;
  };

  inputs = {
    nixpkgs.follows = "effect-microvm/nixpkgs";
    effect-microvm.url = "github:systemfsoftware/effect-microvm/<rev>";
    pnpm-release-management.url = "github:systemfsoftware/pnpm-release-management";
  };

  outputs = { self, nixpkgs, effect-microvm, pnpm-release-management }: {
    packages = nixpkgs.lib.genAttrs [ "x86_64-linux" "aarch64-linux" ] (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in rec {
        producer-tarballs = pnpm-release-management.lib.mkProducerTarballs {
          inherit pkgs;
          producers = { inherit effect-microvm; };
        };
        pnpm-store = pnpm-release-management.lib.mkPnpmConsumerStore {
          inherit pkgs;
          src = self;
          files.".deps" = producer-tarballs;
        };
      });

    devShells = nixpkgs.lib.genAttrs [ "x86_64-linux" "aarch64-linux" ] (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in {
        default = pkgs.mkShell {
          packages = [ pkgs.nodejs_24 pkgs.pnpm_12 ];
          shellHook = self.packages.${system}.producer-tarballs.shellHook;
        };
      });
  };
}
```

Then, inside `nix develop`:

```sh
nix eval --raw .#producer-tarballs.overrides   # paste the output into pnpm-workspace.yaml
pnpm add effect@^4.1.2
```

Declare the packages you use in `package.json` as tarballs in `.deps/`:

```json
"@systemfsoftware/effect-microsandbox": "file:.deps/effect-microsandbox.tgz",
"@systemfsoftware/effect-daemon-microvm": "file:.deps/effect-daemon-microvm.tgz"
```

Add `.deps/` to `.gitignore`.

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
