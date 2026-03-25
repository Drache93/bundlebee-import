# pear-import

Peer-to-peer module imports over Hypercore. Like `require()` or `import`, but the modules live on the distributed web.

Uses [pear-link](https://github.com/holepunchto/pear-link) to resolve `bundle+pear://` links and [bundlebee](https://github.com/holepunchto/bundlebee) to load bundled modules from Hyperbee.

## Install

```
npm install pear-import
```

## Usage

```js
const Corestore = require('corestore')
const Import = require('pear-import')

const store = new Corestore('./storage')
// <-- replicate

const b4a = await Import(store.namespace('b4a'), 'bundle+pear://abc123...def/index.js')
const z32 = await Import(store.namespace('z32'), 'bundle+pear://abc123...def/index.js')

const key = z32.encode(b4a.alloc(32, 'hi!'))
```

### Import multiple

```js
const Corestore = require('corestore')
const Import = require('pear-import')

const store = new Corestore('./storage')
// <-- replicate

const myLib = await Import(store, 'bundle+pear://abc123...def/index.js')
```

### Checkout specific version

Currently older versions of a Bundle can be checked out by choosing the Hypercore length where to checkout at:

```js
// checkout at length 3
const myLib = await Import(store, 'bundle+pear://0.3.abc123...def/index.js')

console.log(myLib) // module.exports from the remote module
```

## How it works

1. A `bundle+pear://` link is parsed to extract the Hypercore drive key and module pathname.
2. A BundleBee instance connects to the drive using the provided Corestore.
3. The target module is loaded and its exports are returned — just like `require()`.

Modules are distributed as bundles stored in a Hyperbee, replicated over the Hypercore protocol. This means they are content-addressed, cacheable, and available from any peer on the swarm.

## API

### `const exports = await Import(store, link, [opts])`

Import a module from a `bundle+pear://` link.

- `store` — A [Corestore](https://github.com/holepunchto/corestore) instance for storage and replication.
- `link` — A `bundle+pear://` link string pointing to the bundled module (e.g. `bundle+pear://<key>/path/to/module.js`).
- `opts` — Optional. Forwarded to BundleBee and the module loader.

Returns a promise that resolves to the module's `exports`.

## License

Apache-2.0
