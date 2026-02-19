const BundleLink = require('./lib/link')
const Hyperbundle = require('hyperbundle')

async function Import(store, link, opts = {}) {
  const parsed = BundleLink.parse(link)
  // TODO check parsed.search for import method. ?b === bundle
  const b = new Hyperbundle(store, { key: parsed.drive.key, ...opts })
  await b.ready()

  if (opts.swarm) {
    opts.swarm.join(b.discoveryKey, { client: true, server: true })
    await opts.swarm.flush()
    await b.core.update()
  }

  let targetLength = parsed.drive.length

  const { length: latestLength } = b.head()
  if (targetLength > latestLength) {
    throw new Error(
      `Requested length ${targetLength} is higher than current length ${latestLength}`
    )
  }

  const search = new URLSearchParams(parsed.search)
  const abi = search && search.has('abi') ? parseInt(search.get('abi'), 10) : 0

  if (abi) {
    const checkout = await b.findABI(abi)
    if (checkout) {
      targetLength = checkout
    }
  }

  const mod = await b.load(new URL(`file:${__dirname}/`), parsed.pathname, targetLength, opts)

  await b.close()

  return mod.exports
}

module.exports = Import
