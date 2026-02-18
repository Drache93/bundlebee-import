const GitPearLink = require('./lib/link')
const BundleBee = require('bundlebee')

async function Import(store, link, opts = {}) {
  const parsed = GitPearLink.parse(link)
  // TODO check parsed.search for import method. ?b === bundle
  const b = new BundleBee(store, { key: parsed.drive.key, ...opts })
  await b.ready()

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
