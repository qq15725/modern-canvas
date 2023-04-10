export interface Container {
  instances: Map<string, any>
  bindings: Map<string, { value: () => any; shared: boolean }>
  get<T = any>(key: string): T
  has(key: string): boolean
  set<T = any>(key: string, value: T): void
  bind<T = any>(key: string, value: () => T, shared?: boolean): void
  singleton<T = any>(key: string, value: () => T): void
  [key: string]: any
}

export function createContainer(): Container {
  const instances = new Map<string, any>()
  const bindings = new Map<string, { value: () => any; shared: boolean }>()

  function get(key: string) {
    if (instances.has(key)) {
      return instances.get(key)
    }

    if (bindings.has(key)) {
      const { value, shared } = bindings.get(key)!
      const instance = value()
      if (shared) set(key, instance)
      return instance
    }

    return undefined
  }

  function has(key: string) {
    return instances.has(key) || bindings.has(key)
  }

  function set(key: string, value: any) {
    instances.set(key, value)
  }

  function singleton(key: string, value: any) {
    bind(key, value, true)
  }

  function bind(key: string, value: any, shared = false) {
    bindings.set(key, { value, shared })
  }

  return new Proxy<Container>(
    { instances, bindings, get, has, set, bind, singleton },
    {
      get(target, key, receiver) {
        if (typeof key === 'symbol' || key in target) return Reflect.get(target, key, receiver)
        return target.get(key)
      },
      has(target, key) {
        if (typeof key === 'symbol' || key in target) return Reflect.has(target, key)
        return target.has(key)
      },
      set(target, key, value, receiver) {
        if (typeof key === 'symbol' || key in target) return Reflect.set(target, key, value, receiver)
        target.set(key, value)
        return true
      },
    },
  )
}
