import type { PropertyDeclaration } from 'modern-idoc'
import type { Node } from './Node'
import { CoreObject } from '../../core'

export class Meta extends CoreObject {
  [key: string]: any

  override getPropertyDeclarations(): Map<string, PropertyDeclaration> {
    const declarations = new Map<string, PropertyDeclaration>()
    this._properties.forEach((_value, key) => {
      declarations.set(key, {
        internalKey: `____${key}` as any,
      })
    })
    return declarations
  }

  override getPropertyDeclaration(key: string): PropertyDeclaration | undefined {
    return { internalKey: `____${key}` as any }
  }

  constructor(
    public parent: Node,
  ) {
    super()

    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (Reflect.has(target, prop) || String(prop).startsWith('_')) {
          return Reflect.get(target, prop, receiver)
        }
        return target.getProperty(String(prop))
      },
      set: (target, prop, value, receiver) => {
        if (Reflect.has(target, prop) || String(prop).startsWith('_')) {
          return Reflect.set(target, prop, value, receiver)
        }
        target.setProperty(String(prop), value)
        return true
      },
      deleteProperty: (target, prop) => {
        if (Reflect.has(target, prop) || String(prop).startsWith('_')) {
          return Reflect.deleteProperty(target, prop)
        }
        target.setProperty(String(prop), undefined)
        return true
      },
    })
  }
}
