import { RawWeakMap } from '../shared'

export interface PropertyDeclaration {
  readonly default?: any | (() => any)
  readonly protected?: boolean
  readonly alias?: string
}

const declarationMap = new RawWeakMap<object, Map<PropertyKey, PropertyDeclaration>>()

export function getDeclarations(constructor: any): Map<PropertyKey, PropertyDeclaration> {
  let declarations = declarationMap.get(constructor)

  if (!declarations) {
    const superConstructor = Object.getPrototypeOf(constructor)
    declarations = new Map(superConstructor ? getDeclarations(superConstructor) : undefined)
    declarationMap.set(constructor, declarations)
  }

  return declarations
}

export function defineProperty(constructor: any, name: PropertyKey, declaration: PropertyDeclaration = {}): void {
  getDeclarations(constructor).set(name, declaration)

  const {
    default: defaultValue,
    alias,
  } = declaration
  let descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, name)

  if (!descriptor) {
    const key = alias ?? Symbol.for(String(name))
    descriptor = {
      get(this: any) { return (this as any)[key] },
      set(this: any, v: unknown) { (this as any)[key] = v },
    }
  }

  const getDefaultValue = (): any => typeof defaultValue === 'function'
    ? defaultValue()
    : defaultValue

  Object.defineProperty(constructor.prototype, name, {
    get(this: any) {
      let value = descriptor!.get?.call(this)
      if (value === undefined) {
        value = getDefaultValue()
        if (value !== undefined) {
          descriptor!.set?.call(this, value)
        }
      }
      return value
    },
    set(this: any, value: unknown) {
      let oldValue = descriptor!.get?.call(this)
      if (oldValue === undefined) {
        oldValue = getDefaultValue()
      }
      descriptor!.set?.call(this, value)
      this.requestUpdate?.(name, oldValue, declaration)
    },
    configurable: true,
    enumerable: true,
  })
}

export function property(options?: PropertyDeclaration): PropertyDecorator {
  return function (proto: any, name: any) {
    defineProperty(proto.constructor, name, options)
  }
}
