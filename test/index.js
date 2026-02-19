const { test } = require('brittle')
const Corestore = require('corestore')
const z32 = require('z32')
const Hyperbundle = require('hyperbundle')
const PearImport = require('..')

test('basic', async (t) => {
  const store = new Corestore(await t.tmp())
  const b = await Hyperbundle.require(
    store,
    './test/fixtures/0.bundle',
    './test/fixtures/1.bundle',
    './test/fixtures/2.bundle',
    { bundle: './test/fixtures/1.bundle', abi: 10 }
  )

  // get latest
  {
    const key = z32.encode(b.key)
    const mod = await PearImport(store, `bundle+pear://${key}/entrypoint.js?b`)
    t.is(mod.toString(), 'bundle-1')
  }

  // get first
  {
    const key = z32.encode(b.key)
    const mod = await PearImport(store, `bundle+pear://0.1.${key}/entrypoint.js?b`)
    t.is(mod, 'bundle-0')
  }

  // get 2nd
  {
    const key = z32.encode(b.key)
    const mod = await PearImport(store, `bundle+pear://0.2.${key}/entrypoint.js?b`)
    t.is(mod, 'bundle-1')
  }

  // get abi
  {
    const key = z32.encode(b.key)
    const mod = await PearImport(store, `bundle+pear://${key}/entrypoint.js?b&abi=10`)
    t.is(mod, 'bundle-1')
  }
})
