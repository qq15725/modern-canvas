import type { EventListenerOptions, EventListenerValue } from '../shared'
import type { PropertyDeclaration } from './decorators'
import { EventEmitter } from '../shared'
import { getDeclarations } from './decorators'
import { nextTick } from './global'

export interface _ObjectEventMap {
  updateProperty: (key: PropertyKey, newValue: any, oldValue: any, declaration?: PropertyDeclaration) => void
}

export interface _Object {
  on: (<K extends keyof _ObjectEventMap>(type: K, listener: _ObjectEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof _ObjectEventMap>(type: K, listener: _ObjectEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof _ObjectEventMap>(type: K, ...args: Parameters<_ObjectEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

let UID = 0

/**
 * Object 是所有 Godot 类的根类。
 * 它提供了基础的功能，如内存管理、信号（signals）机制、实例化和对象生命周期等。
 *
 * 功能和用途：
 *  • 所有的类都继承自 Object，这使得 Godot 中的所有对象都能共享一些基础的功能。
 *  • 提供了内存管理功能，例如销毁对象。
 *  • 支持信号机制，允许对象间进行通信。
 *  • 支持对象的序列化和保存。
 */
export class _Object extends EventEmitter {
  readonly instanceId = ++UID

  protected _defaultProperties?: Record<PropertyKey, any>
  protected _updatedProperties = new Map<PropertyKey, unknown>()
  protected _changedProperties = new Set<PropertyKey>()
  protected _updatePending = Promise.resolve()
  protected _isUpdatePending = false

  protected async _enqueueUpdate(): Promise<void> {
    this._isUpdatePending = true
    try {
      await this._updatePending
    }
    catch (e) {
      Promise.reject(e)
    }
    await nextTick()
    this._performUpdate()
  }

  protected _performUpdate(): void {
    if (!this._isUpdatePending)
      return
    this._onUpdate(this._updatedProperties)
    this._updatedProperties = new Map()
    this._isUpdatePending = false
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _onUpdate(changed: Map<PropertyKey, unknown>): void {
    /** override */
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _onUpdateProperty(key: PropertyKey, newValue: any, oldValue: any, declaration?: PropertyDeclaration): void {
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
    if (!this._isUpdatePending) {
      this._updatePending = this._enqueueUpdate()
    }
  }

  toJSON(): Record<string, any> {
    return this.getProperties(Array.from(this._changedProperties))
  }

  destroy(): void {
    //
  }
}
