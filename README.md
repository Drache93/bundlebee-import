# bundlebee-import

Pinned peer-to-peer module imports for **Bare**, backed by bundlebee v2 and Corestore.

A package name is metadata inside an explicitly keyed bundle. It never selects a feed by itself. Resolve a name/version or ABI against that key, prepare the resulting immutable release, then execute from the local cache:

```js
const Corestore = require('corestore')
const Import = require('bundlebee-import')

const store = new Corestore('./modules')
const pin = await Import.resolve(
  store,
  'bundle+pear://<publisher-key>?name=@example%2Fmath&version=%5E1.0.0',
  { blindPeers: ['<mirror-public-key>'], timeout: 10000 }
)

// Persist pin as JSON alongside your application's configuration.
await Import.prepare(store, pin, { blindPeers: ['<mirror-public-key>'] })
const math = await Import(store, pin)
// The caller owns its store and closes it when finished.
await store.close()
```

## Release identity

A release pin has this shape:

```js
{
  format: 2,
  key: '<canonical z-base-32 publisher key>',
  length: 12, // immutable published module snapshot, not the latest index head
  name: '@example/math',
  version: '1.2.3', // exact semantic version
  entry: '/main.js',
  abi: 1 // positive release generation; separate from native host ABI
}
```

The feed key authenticates the publisher; name/version are selected within that authority. Pin verification compares the stored manifest with every identity field. Newer publications cannot change what an existing pin loads. Executing a pin runs publisher-supplied code with the host's privileges; pinning establishes identity and reproducibility, not a sandbox or an approval policy.

## API

### `Import.resolve(store, link, options) -> Promise<ReleasePin>`

Resolve an explicitly keyed `bundle+pear://` link without executing modules. Supply `name` plus either a semantic version range or a positive integer `abi` as query parameters or options. Version defaults to `*`. Conflicting options, duplicate/unknown query fields, malformed keys, fragments, and combined version/ABI selectors are rejected before opening a store session.

An explicit pathname asserts the published entry; it cannot select arbitrary code from the bundle. Legacy `0.<length>.<key>` authorities may assert a snapshot only with an exact version; ranges, ABI selectors, nonzero forks, and content hashes cannot be combined with a snapshot assertion. Prefer persisting the complete returned pin.

Online resolution updates the index head through bounded retrieval. `offline: true` reads only the local index and never updates or waits for peers. A locally cached index may be older than the publisher's current index.

### `Import.prepare(store, pin, options) -> Promise<ReleasePin>`

Cache and verify all module and asset blocks for a pin. Already-complete caches return without opening any transport. Missing data enables bounded retrieval unless `offline: true`; a missing offline block fails with `ERR_RELEASE_NOT_CACHED`. Preparation does not execute code or choose a newer release.

### `Import(store, pin, options) -> Promise<exports>`

Execute the exact prepared release using bare-module. **Cache-only by default**: no discovery, network connections, latest-head updates, or peer waits. Missing blocks fail promptly. `offline: false` explicitly prepares missing blocks before execution. A string link is accepted only with `offline: false`, which resolves, prepares, and loads it.

`assetDirectory`, `platform: { platform, arch }`, and `hostProviders` are passed to bundlebee's release loader. Host provider entries use exact package specifiers and contain `{ exports, version, abi?, platform?, arch? }`; each must match the release's declared requirement. Native assets need a writable asset directory. No external dependency is resolved implicitly from the importer's local project.

## Networking and ownership

- `blindPeers`: up to eight mirror public keys, encoded strings or 32-byte values. Retrieval first opens owned direct DHT streams and replicates the caller's cache. It sends no add-core/storage registration request. Publishers register mirrors separately, for example with blind-peering.
- `blindTimeout`: mirror phase budget in milliseconds, default 2000.
- `timeout`: total retrieval budget, default 10000. Includes the mirror phase and fallback; it is not reset between phases.
- `fallback`: defaults to `true`. When mirror retrieval fails or times out, an owned Hyperswarm discovers peers for the bundle's discovery key. Set `false` for mirror-only retrieval.
- `bootstrap`: DHT bootstrap nodes (`{ host, port }[]`) for owned networking. Supply this for local/private networks; otherwise normal HyperDHT defaults apply.
- `dht` or `swarm`: optionally borrow a DHT for direct mirror connections. Only `swarm.dht` is used. Fallback creates its own swarm with `bootstrap`; it does not join topics or take connections from a caller's swarm.
- `signal`: abort signal. Cancellation returns `ERR_IMPORT_ABORTED`; a retrieval deadline returns `ERR_IMPORT_TIMEOUT`.

Every operation opens and closes its own Corestore session. Direct mirror streams and fallback swarms are closed on success, timeout, cancellation, and failure. Caller stores, swarms, DHTs, existing streams, and discovery state remain caller-owned, including after malformed input. Offline operations do not allocate any network resources.

Other errors include `ERR_INVALID_RELEASE_LINK`, `ERR_INVALID_IMPORT_OPTIONS`, `ERR_INVALID_RELEASE`, `ERR_RELEASE_NOT_FOUND`, `ERR_RELEASE_NOT_CACHED`, `ERR_HOST_INCOMPATIBLE`, and `ERR_IMPORT_UNAVAILABLE` (no mirrors and fallback disabled).

## Development

This follows the Tether repository template and uses Brittle assertions/runners. Module execution is Bare-only because bundlebee uses bare-module. Portable link/options tests also run on Node; no alternate Node loader is implemented.

```sh
npm install
npm test             # Node portable checks, then full Bare integration
npm run test:types
npm run lint
```

The integration suite uses a local DHT and real Corestores, blind-peer 3.10.2, and publisher-side blind-peering 2.9.5. It covers an offline publisher served by a mirror, fallback from an unavailable mirror, immutable pins across newer releases, prompt offline cache misses, cancellation, deadlines, and caller resource ownership. No public DHT or remote mirror is required.

For development before bundlebee v2 is published, pack the sibling bundlebee checkout and install its tarball using `npm install --no-save --package-lock=false /path/to/bundlebee-2.0.0.tgz`. Do not save local file dependencies. **Publish bundlebee v2 before publishing this importer.** Library lockfiles and node_modules are ignored, following the template.

Version 2 intentionally replaces implicit floating string imports from version 1. Resolve and persist a complete release pin, prepare it explicitly, then import that pin. Old version-1 binary bundle fixtures remain in the repository as historical test assets; new integration fixtures are generated from source during each test.
