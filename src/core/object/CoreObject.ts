import type { PropertyDeclaration, ReactiveObject, ReactiveObjectGetterSetterContext } from 'modern-idoc'
import type { EventListenerOptions, EventListenerValue } from './EventEmitter'
import { getDeclarations } from 'modern-idoc'
import { nextTick } from '../global'
import { EventEmitter } from './EventEmitter'

export interface CoreObjectEventMap {
  updateProperty: (key: string, newValue: any, oldValue: any, declaration?: PropertyDeclaration) => void
}

export interface CoreObject {
  on: (<K extends keyof CoreObjectEventMap>(type: K, listener: CoreObjectEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  once: (<K extends keyof CoreObjectEventMap>(type: K, listener: CoreObjectEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof CoreObjectEventMap>(type: K, listener?: CoreObjectEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof CoreObjectEventMap>(type: K, ...args: Parameters<CoreObjectEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export interface CustomPropertyAccessor {
  get: (key: string, fallback: () => any) => any
  set: (key: string, value: any) => void
}

let IID = 0

export class CoreObject extends EventEmitter implements Required<ReactiveObject> {
  readonly instanceId = ++IID

  protected _customPropertyAccessor?: CustomPropertyAccessor
  protected _properties = new Map<string, unknown>()
  protected _updatedProperties = new Map<string, unknown>()
  protected _changedProperties = new Set<string>()
  protected _updatingPromise = Promise.resolve()
  protected _updating = false

  useCustomPropertyAccessor(accessor: CustomPropertyAccessor): this {
    this._customPropertyAccessor = accessor
    this.getPropertyDeclarations().forEach((declaration, key) => {
      const newValue = accessor.get(key, () => undefined)
      const oldValue = this._properties.get(key)
      if (newValue === undefined) {
        if (oldValue !== undefined) {
          accessor.set(key, oldValue)
        }
      }
      else if (newValue !== oldValue) {
        this._properties.set(key, newValue)
        this._updateProperty(key, newValue, oldValue, declaration)
        this.emit('updateProperty', key, newValue, oldValue, declaration)
      }
    })
    return this
  }

  getter(key: string, context: ReactiveObjectGetterSetterContext): any {
    if (context.declaration.protected) {
      // @ts-expect-error ignore
      return this[context.internalKey]
    }
    else {
      return this._customPropertyAccessor
        ? this._customPropertyAccessor.get(key, () => this._properties.get(key))
        : this._properties.get(key)
    }
  }

  setter(key: string, value: any, context: ReactiveObjectGetterSetterContext): void {
    if (context.declaration.protected) {
      // @ts-expect-error ignore
      this[context.internalKey] = value
    }
    else {
      if (this._customPropertyAccessor) {
        this._customPropertyAccessor.set(key, value)
      }
      this._properties.set(key, value)
    }
  }

  equal(target: CoreObject | undefined | null): boolean {
    return Boolean(target && this.instanceId === target.instanceId)
  }

  protected async _enqueueUpdate(): Promise<void> {
    this._updating = true
    try {
      await this._updatingPromise
    }
    catch (e) {
      Promise.reject(e)
    }
    await nextTick()
    if (!this._updating)
      return
    this.update()
    this._updating = false
  }

  update(): void {
    this._update(this._updatedProperties)
    this._updatedProperties = new Map()
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _update(changed: Map<string, any>): void {
    /** override */
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _updateProperty(key: string, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    /** override */
  }

  isDirty(key: string): boolean {
    return this._updatedProperties.has(key)
  }

  getPropertyDeclarations(): Map<string, PropertyDeclaration> {
    return getDeclarations(this.constructor)
  }

  getPropertyDeclaration(key: string): PropertyDeclaration | undefined {
    return this.getPropertyDeclarations().get(key)
  }

  getProperty(key: string): any | undefined {
    // @ts-expect-error ignore
    return this[key]
  }

  setProperty(key: string, value: any): this {
    // @ts-expect-error ignore
    this[key] = value
    return this
  }

  getProperties(keys?: string[]): Record<string, any> {
    const properties: Record<string, any> = {}
    for (const [name, property] of this.getPropertyDeclarations()) {
      if (!property.protected && !property.alias && (!keys || keys.includes(name))) {
        properties[name] = this.getProperty(name)
      }
    }
    return properties
  }

  setProperties(properties?: any): this {
    if (properties && typeof properties === 'object') {
      for (const [name] of this.getPropertyDeclarations()) {
        if (name in properties) {
          this.setProperty(name, properties[name])
        }
      }
    }
    return this
  }

  resetProperties(): this {
    for (const [name, property] of this.getPropertyDeclarations()) {
      this.setProperty(
        name,
        typeof property.fallback === 'function'
          ? property.fallback()
          : property.fallback,
      )
    }
    return this
  }

  onUpdateProperty(key: string, newValue: unknown, oldValue: unknown, declaration: PropertyDeclaration): void {
    this.requestUpdate(key, newValue, oldValue, declaration)
  }

  requestUpdate(key?: string, newValue?: unknown, oldValue?: unknown, declaration?: PropertyDeclaration): void {
    if (key !== undefined) {
      if (!Object.is(newValue, oldValue)) {
        this._updatedProperties.set(key, oldValue)
        this._changedProperties.add(key)
        declaration ??= this.getPropertyDeclaration(key)
        this._updateProperty(key, newValue, oldValue, declaration)
        this.emit('updateProperty', key, newValue, oldValue, declaration)
      }
      else {
        return
      }
    }
    if (!this._updating) {
      this._updatingPromise = this._enqueueUpdate()
    }
  }

  toPropsJSON(): Record<string, any> {
    const json: Record<string, any> = {}
    this._properties.forEach((value, key) => {
      if (value === undefined) {
        return
      }
      if (value && typeof value === 'object') {
        if ('toJSON' in value && typeof value.toJSON === 'function') {
          json[key] = value.toJSON()
        }
        else {
          json[key] = { ...value }
        }
      }
      else {
        json[key] = value
      }
    })
    return json
  }

  toJSON(): Record<string, any> {
    return this.toPropsJSON()
  }

  clone(): this {
    return new (this.constructor as any)(this.toJSON())
  }

  free(): void {
    this.removeAllListeners()
  }
}
