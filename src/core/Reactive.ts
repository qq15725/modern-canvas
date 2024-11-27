import type { PropertyDeclaration } from './decorators'
import { EventEmitter } from '../shared'
import { getDeclarations } from './decorators'
import { nextTick } from './global'

let UID = 0
export class Reactive extends EventEmitter {
  readonly instanceId = ++UID

  protected _defaultProperties?: Record<PropertyKey, any>
  protected _updatedProperties = new Map<PropertyKey, unknown>()
  protected _changedProperties = new Set<PropertyKey>()
  protected _updatePending = Promise.resolve()
  protected _isUpdatePending = false

  isDirty(key: string): boolean { return this._updatedProperties.has(key) }

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

  setProperties(properties: Record<PropertyKey, any>): this {
    for (const [name] of this.getPropertyDeclarations()) {
      if (name in properties) {
        this.setProperty(name, properties[name])
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
        this._onUpdateProperty(key, newValue, oldValue)
        this.emit('updateProperty', key, newValue, oldValue, declaration ?? this.getPropertyDeclaration(key))
      }
      else {
        return
      }
    }
    if (!this._isUpdatePending) {
      this._updatePending = this._enqueueUpdate()
    }
  }

  protected async _enqueueUpdate() {
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

  protected _performUpdate() {
    if (!this._isUpdatePending)
      return
    this._onUpdate(this._updatedProperties)
    this._updatedProperties = new Map()
    this._isUpdatePending = false
  }

  protected _onUpdate(_changed: Map<PropertyKey, unknown>): void { /** override */ }
  protected _onUpdateProperty(_key: PropertyKey, _value: any, _oldValue: any): void { /** override */ }

  toJSON(): Record<string, any> {
    return this.getProperties(Array.from(this._changedProperties))
  }
}
