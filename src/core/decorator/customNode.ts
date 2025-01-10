export interface CustomNodeProperties {
  tag: string
  renderable?: boolean
}

export const customNodes = new Map<string, any>()

export function customNode(tag: string): ClassDecorator
export function customNode(options: CustomNodeProperties): ClassDecorator
export function customNode(options: string | CustomNodeProperties): ClassDecorator {
  let tag: string
  let renderable: boolean | undefined
  if (typeof options === 'string') {
    tag = options
  }
  else {
    ({ tag, renderable } = options)
  }

  return function (constructor: any) {
    Object.defineProperty(constructor.prototype, 'tag', {
      value: tag,
      enumerable: true,
      configurable: true,
    })

    if (typeof renderable !== 'undefined') {
      Object.defineProperty(constructor, 'renderable', {
        value: renderable,
        enumerable: false,
        configurable: false,
      })
    }

    customNodes.set(tag, constructor)
  }
}
