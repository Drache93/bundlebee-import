declare module 'pear-import' {
  /**
   * Import a module from the peer-to-peer network using a pear:// link.
   *
   * @param store - A Corestore instance used for replication and storage.
   * @param link - A pear:// link pointing to a bundled module.
   * @param opts - Optional settings forwarded to BundleBee and the module loader.
   * @returns The exported value(s) of the resolved module.
   *
   * @example
   * ```js
   * const Corestore = require('corestore')
   * const Import = require('pear-import')
   *
   * const store = new Corestore('./storage')
   * const myLib = await Import(store, 'pear://abc123...def/index.js')
   * ```
   */
  function Import(store: any, link: string, opts?: Import.Options): Promise<any>

  namespace Import {
    interface Options {
      [key: string]: any
    }
  }

  export = Import
}
