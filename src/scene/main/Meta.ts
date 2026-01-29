import type { PropertyDeclaration } from 'modern-idoc'
import type { Node } from './Node'
import { CoreObject } from '../../core'

export class Meta extends CoreObject {
  [key: string]: any

  override getPropertyDeclarations(): Record<string, PropertyDeclaration> {
    super.getPropertyDeclarations()
    const declarations = {}
    Object.keys(this._properties).forEach((key) => {
      ;(declarations as any)[key] = {
        internalKey: `____${key}` as any,
      }
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
