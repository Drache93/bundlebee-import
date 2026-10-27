import Import = require('../index')

async function contract(store: Import.Store, pin: Import.ReleasePin) {
  const resolved: Import.ReleasePin = await Import.resolve(store, 'bundle+pear://key?name=app', {
    version: '^1.0.0'
  })
  await Import.prepare(store, resolved, { offline: true })
  const value: { answer: number } = await Import<{ answer: number }>(store, pin)
  await Import(store, 'bundle+pear://key?name=app', { offline: false })
  // @ts-expect-error Floating links cannot execute without explicit network opt-in.
  await Import(store, 'bundle+pear://key?name=app')
  // @ts-expect-error Pins must use format 2.
  await Import(store, { ...pin, format: 1 })
  return value
}
void contract
