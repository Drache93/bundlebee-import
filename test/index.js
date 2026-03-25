const { test } = require('brittle')
const Corestore = require('corestore')
const z32 = require('z32')
const Bundlebee = require('bundlebee')
const PearImport = require('..')

test('basic', async (t) => {
  const store1 = new Corestore(await t.tmp())
  const b = await Bundlebee.require(
    store1,
    './test/fixtures/0.bundle',
    './test/fixtures/1.bundle',
    './test/fixtures/2.bundle',
    { bundle: './test/fixtures/1.bundle', abi: 10 }
  )

  const store2 = new Corestore(await t.tmp())

  const s1 = store1.replicate(true)
  const s2 = store2.replicate(false)
  s1.pipe(s2).pipe(s1)

  const key = z32.encode(b.key)

  // get latest
  {
    const mod = await PearImport(store2.session(), `bundle+pear://${key}/entrypoint.js?b`)
    t.is(mod.toString(), 'bundle-1')
  }

  // get first
  {
    const mod = await PearImport(store2.session(), `bundle+pear://0.1.${key}/entrypoint.js?b`)
    t.is(mod, 'bundle-0')
  }

  // get 2nd
  {
    const mod = await PearImport(store2.session(), `bundle+pear://0.2.${key}/entrypoint.js?b`)
    t.is(mod, 'bundle-1')
  }

  // get abi
  {
    const mod = await PearImport(store2.session(), `bundle+pear://${key}/entrypoint.js?b&abi=3`)
    t.is(mod, 'bundle-2')
  }
})

test('bad', async (t) => {
  const store = new Corestore(await t.tmp())

  {
    await t.exception(() => PearImport(store.session(), `bundle.js?b`), /Error: Invalid link/)
  }

  {
    await t.exception(
      () =>
        PearImport(store.session(), `bundle+pear://bad`).catch((e) => {
          throw e.name
        }),
      /ERR_INVALID_LINK/
    )
  }
})
