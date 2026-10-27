/** Execute a prepared, immutable release on Bare. Network access is opt-in. */
declare function Import<T = unknown>(
  store: Import.Store,
  pin: Import.ReleasePin,
  options?: Import.Options
): Promise<T>
declare function Import<T = unknown>(
  store: Import.Store,
  link: string,
  options: Import.Options & { offline: false }
): Promise<T>

declare namespace Import {
  /** A caller-owned Corestore. The importer closes only sessions it creates. */
  interface Store {
    session(): StoreSession
  }
  interface StoreSession {
    close(): Promise<void>
  }
  interface DHT {
    connect(publicKey: Uint8Array): unknown
  }
  interface Swarm {
    dht: DHT
  }

  interface ReleasePin {
    format: 2
    key: string
    length: number
    name: string
    version: string
    entry: string
    abi: number
  }
  interface AbortSignal {
    readonly aborted: boolean
    readonly reason?: unknown
    addEventListener(type: 'abort', listener: () => void, options?: { once?: boolean }): void
    removeEventListener(type: 'abort', listener: () => void): void
  }
  interface NetworkOptions {
    /** Never dial, discover, wait for peers or update the head. */
    offline?: boolean
    signal?: AbortSignal
    /** Total retrieval deadline, milliseconds. Default 10000. */
    timeout?: number
    /** Mirror phase deadline within the total budget. Default 2000. */
    blindTimeout?: number
    /** Up to eight blind-peer public keys. Consumer requests do not register storage. */
    blindPeers?: Array<string | Uint8Array>
    /** Disable swarm discovery fallback. Default true. */
    fallback?: boolean
    /** Bootstrap nodes for owned mirror DHT and fallback swarm. */
    bootstrap?: Array<{ host: string; port: number }>
    /** Borrowed only for direct mirror streams; never destroyed. */
    dht?: DHT
    /** Only its DHT is borrowed. Discovery and connections stay untouched. */
    swarm?: Swarm
  }
  interface ResolveOptions extends NetworkOptions {
    name?: string
    version?: string
    abi?: number
  }
  interface HostProvider {
    exports: unknown
    version: string
    abi?: string | number
    platform?: string
    arch?: string
  }
  interface Options extends NetworkOptions {
    assetDirectory?: string
    platform?: { platform: string; arch: string }
    hostProviders?: Record<string, HostProvider>
  }
  /** Resolve an explicitly keyed link to immutable metadata, without executing code. */
  function resolve(store: Import.Store, link: string, options?: ResolveOptions): Promise<ReleasePin>
  /** Cache every release block and asset. Complete caches require no network. */
  function prepare(
    store: Import.Store,
    pin: ReleasePin,
    options?: NetworkOptions
  ): Promise<ReleasePin>
}

export = Import
