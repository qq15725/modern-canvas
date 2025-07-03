import { defineProperty } from 'modern-idoc'

export const customNodes = new Map<string, any>()

export function customNode<T = Record<string, any>>(name: string, defaultProperties?: Partial<T>): ClassDecorator {
  return function (constructor: any) {
    Object.defineProperty(constructor.prototype, 'is', {
      value: name,
      enumerable: true,
      configurable: true,
    })

    if (defaultProperties) {
      Object.keys(defaultProperties).forEach((key) => {
        defineProperty(constructor.prototype, key, {
          fallback: (defaultProperties as any)[key],
        })
      })
    }

    customNodes.set(name, constructor)
  }
}
