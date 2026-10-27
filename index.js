const Bundlebee = require('bundlebee')
const selectors = require('./lib/selectors')
const network = require('./lib/network')
const { error } = require('./lib/errors')

async function Import(store, pin, opts = {}) {
  network.validate(opts)
  if (typeof pin === 'string') {
    if (opts.offline !== false) {
      throw error(
        'ERR_INVALID_RELEASE',
        'Import a release pin, or explicitly use offline: false for a link'
      )
    }
    pin = await Import.resolve(store, pin, opts)
  }
  pin = validate(pin, opts)
  if (opts.offline === false) await Import.prepare(store, pin, opts)
  return withBundle(store, pin.key, true, async (bundle) => {
    const module = await bundle.loadRelease(pin, { ...opts, offline: true })
    return module.exports
  })
}

Import.resolve = async function resolve(store, link, opts = {}) {
  network.validate(opts)
  const parsed = selectors(link, opts)
  return await withBundle(store, parsed.key, opts.offline === true, (bundle, session) => {
    const resolve = async (signal) => {
      if (!opts.offline) await update(bundle.core, signal)
      const pin = await bundle.resolve({
        ...parsed.selector,
        offline: opts.offline === true,
        signal
      })
      if (
        (parsed.length !== null && parsed.length !== pin.length) ||
        (parsed.entry && parsed.entry !== pin.entry)
      ) {
        throw error(
          'ERR_INVALID_RELEASE_LINK',
          'The release does not match the asserted snapshot or entry'
        )
      }
      return pin
    }
    return opts.offline ? resolve(opts.signal) : network.retrieve(bundle, session, opts, resolve)
  })
}

Import.prepare = async function prepare(store, pin, opts = {}) {
  pin = validate(pin, opts)
  // Probe without opening any transport. A complete cache never needs a network.
  try {
    return await withBundle(store, pin.key, true, (bundle) =>
      bundle.prefetch(pin, { offline: true, signal: opts.signal })
    )
  } catch (err) {
    if (opts.offline || err.code !== 'ERR_RELEASE_NOT_CACHED') throw err
  }
  return withBundle(store, pin.key, false, (bundle, session) =>
    network.retrieve(bundle, session, opts, (signal) => bundle.prefetch(pin, { signal }))
  )
}

function validate(pin, opts) {
  network.validate(opts)
  const valid = Bundlebee.validateRelease(pin)
  for (const key of ['key', 'length', 'name', 'version', 'entry', 'abi']) {
    if (opts[key] !== undefined && opts[key] !== valid[key]) {
      throw error('ERR_INVALID_RELEASE', 'Conflicting pin selector: ' + key)
    }
  }
  return valid
}

async function withBundle(store, key, offline, fn) {
  const session = store.session()
  let bundle
  try {
    bundle = new Bundlebee(session, { key, offline })
    await bundle.ready()
    return await fn(bundle, session)
  } catch (err) {
    if (err?.code === 'ABORT_ERR') {
      throw error('ERR_IMPORT_ABORTED', 'Release operation was cancelled', err)
    }
    throw err
  } finally {
    if (bundle) await bundle.close()
    else await session.close()
  }
}

async function update(core, signal) {
  const requests = []
  const cancel = () => core.constructor.destroyRequests(requests, signal.reason)
  if (signal?.aborted) throw signal.reason
  signal?.addEventListener('abort', cancel, { once: true })
  try {
    await core.update({ wait: true, activeRequests: requests })
  } finally {
    signal?.removeEventListener('abort', cancel)
    core.constructor.destroyRequests(requests)
  }
}

module.exports = Import
