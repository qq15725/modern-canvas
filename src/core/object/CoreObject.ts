import type { PropertyDeclaration } from 'modern-idoc'
import type { EventListenerOptions, EventListenerValue } from './EventEmitter'
import { getDeclarations } from 'modern-idoc'
import { nextTick } from '../global'
import { EventEmitter } from './EventEmitter'

export interface CoreObjectEventMap {
  updateProperty: (key: PropertyKey, newValue: any, oldValue: any, declaration?: PropertyDeclaration) => void
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

let UID = 0

export class CoreObject extends EventEmitter {
  readonly instanceId = ++UID

  protected _defaultProperties?: Record<PropertyKey, any>
  protected _updatedProperties = new Map<PropertyKey, any>()
  protected _changedProperties = new Set<PropertyKey>()
  protected _updatingPromise = Promise.resolve()
  protected _updating = false

  is(target: CoreObject | undefined | null): boolean {
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
  protected _update(changed: Map<PropertyKey, any>): void {
    /** override */
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    /** override */
  }

  isDirty(key: string): boolean {
    return this._updatedProperties.has(key)
  }

  getPropertyDeclarations(): Map<PropertyKey, PropertyDeclaration> {
    return getDeclarations(this.constructor)
  }

  getPropertyDeclaration(key: PropertyKey): PropertyDeclaration | undefined {
    return this.getPropertyDeclarations().get(key)
  }

  getDefaultProperties(): Record<PropertyKey, any> {
    if (!this._defaultProperties) {
      this._defaultProperties = {}
      for (const [name, property] of this.getPropertyDeclarations()) {
        if (!property.protected && !property.alias) {
          this._defaultProperties[name] = typeof property.default === 'function'
            ? property.default()
            : property.default
        }
      }
    }
    return this._defaultProperties
  }

  getProperty(key: PropertyKey): any | undefined {
    return (this as any)[key]
  }

  setProperty(key: PropertyKey, value: any): this {
    (this as any)[key] = value
    return this
  }

  getProperties(keys?: PropertyKey[]): Record<PropertyKey, any> {
    const properties: Record<PropertyKey, any> = {}
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
      this.setProperty(name, property.default)
    }
    return this
  }

  requestUpdate(key?: PropertyKey, newValue?: unknown, oldValue?: unknown, declaration?: PropertyDeclaration): void {
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

  toJSON(): Record<string, any> {
    const json: Record<string, any> = {}
    const properties = this.getProperties(Array.from(this._changedProperties))
    for (const key in properties) {
      const value = properties[key]
      if (
        value
        && typeof value === 'object'
      ) {
        if (
          'toJSON' in value
          && typeof value.toJSON === 'function'
        ) {
          json[key] = value.toJSON()
        }
        else {
          json[key] = { ...value }
        }
      }
      else {
        json[key] = value
      }
    }
    return json
  }

  clone(): this {
    return new (this.constructor as any)(this.toJSON())
  }

  free(): void {
    this.removeAllListeners()
  }
}
