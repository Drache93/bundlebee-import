const Hyperswarm = require('hyperswarm')
const DHT = require('hyperdht')
const AbortController = require('bare-abort-controller')
const id = require('hypercore-id-encoding')
const { error } = require('./errors')

exports.validate = function validate(opts) {
  if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
    throw error('ERR_INVALID_IMPORT_OPTIONS', 'Options must be an object')
  }
  for (const key of ['offline', 'fallback']) {
    if (opts[key] !== undefined && typeof opts[key] !== 'boolean') {
      throw error('ERR_INVALID_IMPORT_OPTIONS', key + ' must be a boolean')
    }
  }
  if (
    opts.signal !== undefined &&
    (!opts.signal ||
      typeof opts.signal.aborted !== 'boolean' ||
      typeof opts.signal.addEventListener !== 'function' ||
      typeof opts.signal.removeEventListener !== 'function')
  ) {
    throw error('ERR_INVALID_IMPORT_OPTIONS', 'signal must be an AbortSignal')
  }
  if (
    opts.bootstrap !== undefined &&
    (!Array.isArray(opts.bootstrap) ||
      opts.bootstrap.some(
        (node) =>
          !node ||
          typeof node.host !== 'string' ||
          !node.host.trim() ||
          !Number.isInteger(node.port) ||
          node.port < 1 ||
          node.port > 65535
      ))
  ) {
    throw error('ERR_INVALID_IMPORT_OPTIONS', 'bootstrap must contain host and port pairs')
  }
  if (
    (opts.dht !== undefined && typeof opts.dht?.connect !== 'function') ||
    (opts.swarm !== undefined && typeof opts.swarm?.dht?.connect !== 'function')
  ) {
    throw error(
      'ERR_INVALID_IMPORT_OPTIONS',
      'Borrowed networking must provide a DHT connect method'
    )
  }
  for (const key of ['timeout', 'blindTimeout']) {
    if (
      opts[key] !== undefined &&
      (!Number.isSafeInteger(opts[key]) || opts[key] < 1 || opts[key] > 2147483647)
    ) {
      throw error(
        'ERR_INVALID_IMPORT_OPTIONS',
        key + ' must be an integer from 1 to 2147483647 milliseconds'
      )
    }
  }
  if (
    opts.blindPeers !== undefined &&
    (!Array.isArray(opts.blindPeers) || opts.blindPeers.length > 8)
  ) {
    throw error(
      'ERR_INVALID_IMPORT_OPTIONS',
      'blindPeers must be an array of at most eight public keys'
    )
  }
  try {
    for (const key of opts.blindPeers || []) id.decode(key)
  } catch (cause) {
    throw error('ERR_INVALID_IMPORT_OPTIONS', 'Invalid blind peer public key', cause)
  }
  if (opts.signal?.aborted) throw aborted(opts.signal)
}

exports.retrieve = async function retrieve(bundle, store, opts, operation) {
  const deadline = Date.now() + (opts.timeout ?? 10000)
  let lastError
  if (opts.blindPeers?.length) {
    try {
      return await phase(
        Math.min(opts.blindTimeout ?? 2000, deadline - Date.now()),
        opts.signal,
        async (signal) => {
          const borrowed = opts.dht || opts.swarm?.dht
          const dht = borrowed || new DHT({ bootstrap: opts.bootstrap })
          // A separate identity prevents remote swarms from replacing caller connections.
          const keyPair = DHT.keyPair()
          const streams = []
          const closed = []
          const done = bundle.core.findingPeers()
          try {
            for (const key of opts.blindPeers) {
              const stream = dht.connect(id.decode(key), { keyPair })
              stream.on('error', noop)
              streams.push(stream)
              closed.push(new Promise((resolve) => stream.once('close', resolve)))
              store.replicate(stream)
            }
            Promise.all(streams.map((stream) => stream.opened)).then(done, done)
            return await operation(signal)
          } finally {
            done()
            for (const stream of streams) stream.destroy()
            await Promise.all(closed)
            if (!borrowed) await dht.destroy()
          }
        }
      )
    } catch (err) {
      lastError = err
      if (opts.signal?.aborted) throw aborted(opts.signal)
    }
  }
  if (opts.fallback === false) {
    throw (
      lastError ||
      error('ERR_IMPORT_UNAVAILABLE', 'No blind peers configured and swarm fallback is disabled')
    )
  }
  if (Date.now() >= deadline) {
    throw lastError || error('ERR_IMPORT_TIMEOUT', 'Release retrieval timed out')
  }
  return phase(deadline - Date.now(), opts.signal, async (signal) => {
    // An independent swarm avoids taking ownership of shared discovery state or DHTs.
    const swarm = new Hyperswarm({ bootstrap: opts.bootstrap })
    const done = bundle.core.findingPeers()
    swarm.on('connection', (stream) => store.replicate(stream))
    try {
      swarm.join(bundle.discoveryKey, { client: true, server: false })
      swarm.flush().then(done, done)
      return await operation(signal)
    } finally {
      done()
      await swarm.destroy()
    }
  })
}

async function phase(timeout, signal, run) {
  if (signal?.aborted) throw aborted(signal)
  const controller = new AbortController()
  const onabort = () => controller.abort(aborted(signal))
  signal?.addEventListener('abort', onabort, { once: true })
  const timer = setTimeout(
    () => controller.abort(error('ERR_IMPORT_TIMEOUT', 'Release retrieval timed out')),
    Math.max(0, timeout)
  )
  try {
    return await run(controller.signal)
  } catch (err) {
    if (controller.signal.aborted) throw controller.signal.reason
    throw err
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onabort)
  }
}

function aborted(signal) {
  return error('ERR_IMPORT_ABORTED', 'Release retrieval was cancelled', signal?.reason)
}

function noop() {}
