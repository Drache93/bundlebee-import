const { test } = require('brittle')
const Corestore = require('corestore')
const z32 = require('z32')
const BundleBee = require('bundlebee')
const PearImport = require('..')

test('basic', async (t) => {
  const store = new Corestore(await t.tmp())
  const b = await BundleBee.require(
    store,
    './test/fixtures/0.bundle',
    './test/fixtures/1.bundle',
    './test/fixtures/2.bundle'
  )

  {
    const { source, resolutions } = await b.get('/entrypoint.js')
    t.is(source.toString().trim(), `module.exports = 'bundle-2'`)
    t.alike(resolutions, Object.assign(Object.create(null), { '#package': '/package.json' }))
  }

  {
    const { source, resolutions } = await b.get('/entrypoint.js', 1)
    t.is(source.toString().trim(), `module.exports = 'bundle-0'`)
    t.alike(resolutions, Object.assign(Object.create(null), { '#package': '/package.json' }))
  }

  {
    const mod = await b.load(new URL(`file:${__dirname}/fixtures/3/`), '/entrypoint.js')
    t.ok(mod)
    t.is(mod.exports, 'bundle-2')
  }

  const layer = await b.add(new URL(`file:${__dirname}/fixtures/3/`), 'entrypoint.js')
  t.ok(layer)
  t.ok(layer.toBuffer())

  const mod = await b.load(new URL(`file:${__dirname}/fixtures/3/`), '/entrypoint.js')
  t.is(mod.exports(), 'bundle-2')

  // get latest
  {
    const key = z32.encode(b.key)
    const mod = await PearImport(store, `git+pear://0.4.${key}/entrypoint.js?b`)
    t.is(mod.toString(), `() => b4a.from('bundle-2').toString('utf-8')`)
  }

  // get first
  {
    const key = z32.encode(b.key)
    const mod = await PearImport(store, `git+pear://0.1.${key}/entrypoint.js?b`)
    t.is(mod, 'bundle-0')
  }

  // get 2nd
  {
    const key = z32.encode(b.key)
    const mod = await PearImport(store, `git+pear://0.2.${key}/entrypoint.js?b`)
    t.is(mod, 'bundle-1')
  }
})
