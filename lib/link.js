const { constructor: PearLink } = require('pear-link')

class BundleLink extends PearLink {
  serialize(o) {
    if (o.protocol?.startsWith('bundle+pear:') === false) return super.serialize(o)
    o.protocol = o.protocol.slice(7)
    o.origin = o.origin.slice(7)
    return 'bundle+' + super.serialize(o)
  }
  parse(link) {
    if (link.startsWith('bundle+pear:') === false) return super.parse(link)
    const parsed = super.parse(link.slice(7))
    parsed.protocol = 'bundle+' + parsed.protocol
    parsed.origin = 'bundle+' + parsed.origin
    return parsed
  }
}

module.exports = new BundleLink()
