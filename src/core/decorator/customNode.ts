import { defineProperty } from './property'

export const customNodes = new Map<string, any>()

export function customNode<T = Record<string, any>>(tag: string, defaultProperties?: Partial<T>): ClassDecorator {
  return function (constructor: any) {
    Object.defineProperty(constructor.prototype, 'tag', {
      value: tag,
      enumerable: true,
      configurable: true,
    })

    if (defaultProperties) {
      Object.keys(defaultProperties).forEach((key) => {
        defineProperty(constructor, key, { default: (defaultProperties as any)[key] })
      })
    }

    customNodes.set(tag, constructor)
  }
}
