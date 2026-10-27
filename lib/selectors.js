const Link = require('./link')
const id = require('hypercore-id-encoding')
const { Range, Version } = require('bare-semver')
const { error } = require('./errors')

module.exports = function selectors(link, opts = {}) {
  try {
    if (typeof link !== 'string') throw new Error('Expected a keyed bundle+pear link')
    const rawPath = link.replace(/^[^:]+:\/\/[^/]+/, '').split(/[?#]/)[0]
    if (rawPath.split('/').some((part) => ['.', '..'].includes(decodeURIComponent(part)))) {
      throw new Error('Invalid entry assertion')
    }
    const parsed = Link.parse(link)
    if (parsed.protocol !== 'bundle+pear:') throw new Error('Expected bundle+pear protocol')
    if (parsed.hash || parsed.drive.hash) throw new Error('Hash selectors are unsupported')
    if (parsed.drive.fork && parsed.drive.fork !== 0) {
      throw new Error('Fork selectors are unsupported')
    }
    const key = id.normalize(parsed.drive.key)
    if (opts.key !== undefined && id.normalize(opts.key) !== key) {
      throw new Error('Conflicting key authority')
    }
    if (opts.length !== undefined && opts.length !== parsed.drive.length) {
      throw new Error('Conflicting snapshot selector')
    }
    const query = new URLSearchParams(parsed.search)
    for (const [key] of query) {
      if (!['name', 'version', 'abi'].includes(key) || query.getAll(key).length !== 1) {
        throw new Error('Unknown or repeated release selector: ' + key)
      }
    }
    const selector = {}
    for (const key of ['name', 'version', 'abi']) {
      const value = query.get(key)
      if (value !== null && opts[key] !== undefined && String(opts[key]) !== value) {
        throw new Error('Conflicting release selector: ' + key)
      }
      if (value !== null || opts[key] !== undefined) selector[key] = value ?? opts[key]
    }
    if (
      typeof selector.name !== 'string' ||
      !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(selector.name)
    ) {
      throw new Error('A package name selector is required')
    }
    if (selector.version !== undefined && selector.abi !== undefined) {
      throw new Error('Choose version or ABI, not both')
    }
    if (selector.abi !== undefined) {
      if (!/^[1-9]\d*$/.test(String(selector.abi))) throw new Error('Invalid ABI')
      selector.abi = Number(selector.abi)
      if (!Number.isSafeInteger(selector.abi)) throw new Error('Invalid ABI')
    } else {
      selector.version = selector.version ?? '*'
      if (typeof selector.version !== 'string' || !selector.version.trim()) {
        throw new Error('Invalid version range')
      }
      Range.parse(selector.version)
    }
    const length = parsed.drive.length
    if (length !== null) {
      if (!Number.isSafeInteger(length) || length < 1 || selector.abi !== undefined) {
        throw new Error('Invalid or conflicting snapshot selector')
      }
      if (Version.parse(selector.version).toString() !== selector.version) {
        throw new Error('A snapshot selector requires an exact version')
      }
    }
    // Release metadata determines the entry. An explicit path only asserts it.
    const entry =
      parsed.pathname && parsed.pathname !== '/' ? decodeURIComponent(parsed.pathname) : null
    if (
      entry &&
      (entry.includes('\\') ||
        entry.includes('\0') ||
        entry.split('/').some((part) => part === '..' || part === '.'))
    ) {
      throw new Error('Invalid entry assertion')
    }
    return { key, selector, length, entry }
  } catch (cause) {
    throw error('ERR_INVALID_RELEASE_LINK', cause.message, cause)
  }
}
