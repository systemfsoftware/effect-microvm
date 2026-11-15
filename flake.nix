{
  description = "Effect microVMs: the microsandbox binding, the daemon microVM medium, and the private microVM test images.";

  nixConfig = {
    extra-substituters = "https://nix.systemfsoftware.com";
    extra-trusted-public-keys = "nix-cache-1:wXA8I4DayNW9q6enUyQA/P/nT38pGSTLt374t3gsn7M=";
  };

  inputs = {
    # Core at a full commit, for its dprint build and its nixpkgs.
    core.url = "github:systemfsoftware/systemfsoftware/15b4d2ab1e2af0a154fad2b9af7bd1f6449b3606";
    nixpkgs.follows = "core/nixpkgs";
    pnpm-release-management.url = "github:systemfsoftware/pnpm-release-management/43f24b21b3c475acd03eb576bba6cf48d7ca8e2f";
  };

  outputs = { self, nixpkgs, core, pnpm-release-management }:
    let
      lib = nixpkgs.lib;
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forEachSystem = fn: lib.genAttrs systems (system: fn nixpkgs.legacyPackages.${system});

      # This repository's own public packages, as tarballs downstream flakes consume the same way.
      workspaceOf = pkgs:
        pnpm-release-management.lib.mkPnpmWorkspacePackages {
          inherit pkgs;
          src = self;
          pname = "effect-microvm";
          pnpm = pkgs.pnpm_12;
        };
    in
    {
      packages = forEachSystem (pkgs:
        let system = pkgs.stdenv.hostPlatform.system; in
        workspaceOf pkgs // {
          inherit (core.packages.${system}) dprint;
        });

      checks = forEachSystem (pkgs: {
        consumer-store = pnpm-release-management.lib.mkPnpmConsumerStore {
          inherit pkgs;
          src = self;
          pname = "effect-microvm";
          pnpm = pkgs.pnpm_12;
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
          };
        });
    };
}
