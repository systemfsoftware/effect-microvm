# @systemfsoftware/effect-microsandbox

## 6.0.0

Random bytes come from `effect/crypto/SecureRandom`, so this package no longer imports `effect/Crypto`; effect 4.1.0 removed that module, and every earlier release fails with `ERR_MODULE_NOT_FOUND` on effect 4.1. The service the package requires changes from `Crypto` to `SecureRandom`: provide it with `NodeCrypto.layerSecureRandom` from `@effect/platform-node/NodeCrypto`. The `effect` peer range is `^4.1.2`.

This is the first release made from `systemfsoftware/effect-microvm`. The last tags, `@v5.1.1` and `@v1.0.2` in the core repository, predate the move.
