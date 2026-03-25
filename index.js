const BundleLink = require('./lib/link')
const Bundlebee = require('bundlebee')

async function Import(store, link, opts = {}) {
  const parsed = BundleLink.parse(link)

  // TODO check parsed.search for import method. ?b === bundle

  parsed.drive.length = parsed.drive.length || -1
  const b = new Bundlebee(store, { ...parsed.drive, ...opts })
  await b.ready()

  if (opts.swarm) {
    opts.swarm.join(b.discoveryKey, { client: true, server: true })
    await opts.swarm.flush()
  }

  await b.core.update({ wait: true })

  const latest = b.head()
  if (latest && parsed.drive.length > latest.length) {
    throw new Error(
      `Requested length ${parsed.drive.length} is higher than latest ${latest.length}`
    )
  }

  const search = new URLSearchParams(parsed.search)
  const abi = search && search.has('abi') ? parseInt(search.get('abi'), 10) : 0

  let checkout = parsed.drive.length > 0 ? parsed.drive : undefined
  if (abi) {
    checkout = await b.findABI(abi)
    if (!checkout) {
      throw new Error(`ABI ${abi} not found`)
    }
  }

  const mod = await b.load(new URL(`file:${__dirname}/`), parsed.pathname, checkout)

  await b.close()

  return mod.exports
}

module.exports = Import
