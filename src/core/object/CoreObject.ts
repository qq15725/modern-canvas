import type { PropertyDeclaration } from '../decorator'
import type { EventListenerOptions, EventListenerValue } from './EventEmitter'
import { getDeclarations } from '../decorator'
import { nextTick } from '../global'
import { EventEmitter } from './EventEmitter'

export interface CoreObjectEventMap {
  updateProperty: (key: PropertyKey, newValue: any, oldValue: any, declaration?: PropertyDeclaration) => void
}

export interface CoreObject {
  on: (<K extends keyof CoreObjectEventMap>(type: K, listener: CoreObjectEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof CoreObjectEventMap>(type: K, listener: CoreObjectEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof CoreObjectEventMap>(type: K, ...args: Parameters<CoreObjectEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

let UID = 0

export class CoreObject extends EventEmitter {
  readonly instanceId = ++UID

  protected _defaultProperties?: Record<PropertyKey, any>
  protected _updatedProperties = new Map<PropertyKey, unknown>()
  protected _changedProperties = new Set<PropertyKey>()
  protected _updatingPromise = Promise.resolve()
  protected _updating = false

  protected async _enqueueUpdate(): Promise<void> {
    this._updating = true
    try {
      await this._updatingPromise
    }
    catch (e) {
      Promise.reject(e)
    }
    await nextTick()
    this._performUpdate()
  }

  protected _performUpdate(): void {
    if (!this._updating)
      return
    this._onUpdate(this._updatedProperties)
    this._updatedProperties = new Map()
    this._updating = false
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _onUpdate(changed: Map<PropertyKey, unknown>): void {
    /** override */
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _onUpdateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
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
          this._defaultProperties[name] = property.default
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

  setProperties(properties?: Record<PropertyKey, any>): this {
    if (properties) {
      for (const [name] of this.getPropertyDeclarations()) {
        if (name in properties) {
          this.setProperty(name, properties[name])
        }
      }
    }
    return this
  }

  requestUpdate(key?: PropertyKey, oldValue?: unknown, declaration?: PropertyDeclaration): void {
    if (key !== undefined) {
      const newValue = this[key as keyof this]
      if (!Object.is(newValue, oldValue)) {
        this._updatedProperties.set(key, oldValue)
        this._changedProperties.add(key)
        declaration ??= this.getPropertyDeclaration(key)
        this._onUpdateProperty(key, newValue, oldValue, declaration)
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
    return this.getProperties(Array.from(this._changedProperties))
  }

  clone(): this {
    return new (this.constructor as any)(this.toJSON())
  }

  destroy(): void {
    this.removeAllListeners()
  }
}
