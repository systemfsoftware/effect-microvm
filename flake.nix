{
  description = "Effect microVMs: the microsandbox binding, the daemon microVM medium, and the private microVM test images.";

  nixConfig = {
    extra-substituters = "https://nix.systemfsoftware.com";
    extra-trusted-public-keys = "nix-cache-1:wXA8I4DayNW9q6enUyQA/P/nT38pGSTLt374t3gsn7M=";
    fallback = true;
  };

  inputs = {
    # Producers at full commits. Core and effect-readiness push their tarballs to nix.systemfsoftware.com.
    # effect-daemon does not push yet, so its two tarballs are built from source until it does.
    # Moving a pin is how the repository takes newer packages: bump it, then run pnpm update '@systemfsoftware/*'.
    core.url = "github:systemfsoftware/systemfsoftware/e1c7a5f4655d1705de502ebe0de3c1fa87e35591";
    effect-readiness.url = "github:systemfsoftware/effect-readiness/9ee134541ae274aa0cd7d46a1d91847beaadd61b";
    effect-daemon.url = "github:systemfsoftware/effect-daemon/558cb033935936ef21a6f4258ba462ed71a53b3a";
    nixpkgs.follows = "core/nixpkgs";
    pnpm-release-management.url = "github:systemfsoftware/pnpm-release-management";
  };

  outputs = { self, nixpkgs, core, effect-readiness, effect-daemon, pnpm-release-management }:
    let
      lib = nixpkgs.lib;
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forEachSystem = fn: lib.genAttrs systems (system: fn nixpkgs.legacyPackages.${system});

      # Every @systemfsoftware tarball this repository's lockfile names, from the producer flakes.
      producerTarballsOf = pkgs:
        pnpm-release-management.lib.mkProducerTarballs {
          inherit pkgs;
          producers = { inherit core effect-readiness effect-daemon; };
        };

      # This repository's own public packages, as tarballs downstream flakes consume the same way.
      workspaceOf = pkgs:
        pnpm-release-management.lib.mkPnpmWorkspacePackages {
          inherit pkgs;
          src = self;
          pname = "effect-microvm";
          pnpm = pkgs.pnpm_12;
          files.".deps" = producerTarballsOf pkgs;
        };
    in
    {
      packages = forEachSystem (pkgs:
        let system = pkgs.stdenv.hostPlatform.system; in
        workspaceOf pkgs // {
          producer-tarballs = producerTarballsOf pkgs;
          inherit (core.packages.${system}) dprint;
        });

      checks = forEachSystem (pkgs: {
        consumer-store = pnpm-release-management.lib.mkPnpmConsumerStore {
          inherit pkgs;
          src = self;
          pname = "effect-microvm";
          pnpm = pkgs.pnpm_12;
          files.".deps" = producerTarballsOf pkgs;
        };
      });

      devShells = forEachSystem (pkgs:
        let system = pkgs.stdenv.hostPlatform.system; in {
          default = pkgs.mkShell {
            packages = [
              core.packages.${system}.dprint
              pkgs.nodejs_24
              pkgs.pnpm_12
              pnpm-release-management.packages.${system}.release-tools
              pnpm-release-management.packages.${system}.sandbox
            ];
            SANDBOX_PNPM_STORE = self.packages.${system}.pnpm-store;
            shellHook = self.packages.${system}.producer-tarballs.shellHook;
          };
        });
    };
}
