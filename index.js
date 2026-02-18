const BundleLink = require('./lib/link')
const Hyperbundle = require('hyperbundle')

async function Import(store, link, opts = {}) {
  const parsed = BundleLink.parse(link)
  // TODO check parsed.search for import method. ?b === bundle
  const b = new Hyperbundle(store, { key: parsed.drive.key, ...opts })
  await b.ready()

  const { length: latestLength } = b.head()
  if (parsed.drive.length > latestLength) {
    throw new Error(
      `Requested length ${parsed.drive.length} is higher than current length ${latestLength}`
    )
  }

  const mod = await b.load(
    new URL(`file:${__dirname}/`),
    parsed.pathname,
    parsed.drive.length,
    opts
  )

  await b.close()

  return mod.exports
}

module.exports = Import
