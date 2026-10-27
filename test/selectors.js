const test = require('brittle')
const id = require('hypercore-id-encoding')
const selectors = require('../lib/selectors')
const { validate } = require('../lib/network')
const AbortController = require('bare-abort-controller')
const b4a = require('b4a')
const key = id.encode(b4a.alloc(32, 42))
const link = 'bundle+pear://' + key

test('keyed release selectors preserve explicit authority', (t) => {
  t.alike(selectors(link + '?name=@test%2Fapp&version=%5E1.2.0'), {
    key,
    selector: { name: '@test/app', version: '^1.2.0' },
    length: null,
    entry: null
  })
  t.alike(selectors(link + '/main.js?name=app&abi=3'), {
    key,
    selector: { name: 'app', abi: 3 },
    length: null,
    entry: '/main.js'
  })
  t.alike(selectors('bundle+pear://0.12.' + key + '?name=app&version=1.2.3'), {
    key,
    selector: { name: 'app', version: '1.2.3' },
    length: 12,
    entry: null
  })
  t.is(selectors(link, { name: 'app' }).selector.version, '*')
  t.is(selectors(link + '?name=app&version=1.2.3', { version: '1.2.3' }).key, key)
})

test('invalid and conflicting selectors are rejected before storage access', (t) => {
  const invalid = [
    'pear://' + key + '?name=app',
    'https://example.com',
    'bundle+pear://notakey',
    link,
    link + '?name=app&name=other',
    link + '?name=app&version=1&abi=1',
    link + '?name=app&abi=0',
    link + '?name=app&abi=-1',
    link + '?name=app&abi=1junk',
    link + '?name=app&abi=9007199254740992',
    link + '?name=app&version=garbage',
    link + '?name=app&version=',
    link + '?name=app&unknown=1',
    link + '?name=app#fragment',
    link + '/a/../main.js?name=app',
    link + '/%2e%2e/main.js?name=app',
    link + '/%5cmain.js?name=app',
    link + '/%ZZ?name=app',
    'bundle+pear://1.12.' + key + '?name=app&version=1.0.0',
    'bundle+pear://0.12.' + key + '?name=app&version=^1.0.0',
    'bundle+pear://0.12.' + key + '?name=app&abi=1'
  ]
  for (const input of invalid) {
    t.exception.all(() => selectors(input), { code: 'ERR_INVALID_RELEASE_LINK' }, input)
  }
  for (const opts of [
    { name: 'other' },
    { version: '^2' },
    { abi: 1 },
    { key: id.encode(b4a.alloc(32, 43)) },
    { length: 2 }
  ]) {
    t.exception.all(() => selectors(link + '?name=app&version=1.2.3', opts), {
      code: 'ERR_INVALID_RELEASE_LINK'
    })
  }
})

test('network settings are bounded and cancellation is explicit', (t) => {
  for (const opts of [
    { timeout: 0 },
    { timeout: -1 },
    { timeout: Infinity },
    { timeout: 2147483648 },
    { offline: 'false' },
    { fallback: 1 },
    { signal: {} },
    { signal: null },
    { bootstrap: 'localhost' },
    { bootstrap: [{ host: '', port: 123 }] },
    { bootstrap: [{ host: 'localhost', port: 65536 }] },
    { dht: {} },
    { swarm: {} },
    { blindTimeout: 0 },
    { blindPeers: 'key' },
    { blindPeers: ['invalid'] },
    { blindPeers: Array(9).fill(key) }
  ]) {
    t.exception.all(() => validate(opts), { code: 'ERR_INVALID_IMPORT_OPTIONS' })
  }
  const controller = new AbortController()
  controller.abort()
  t.exception.all(() => validate({ signal: controller.signal }), { code: 'ERR_IMPORT_ABORTED' })
})
