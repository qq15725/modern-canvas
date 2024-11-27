export interface CustomNodeOptions {
  tag: string
  renderable?: boolean
}

export const customNodes = new Map<string, any>()

export function customNode(tag: string): any
export function customNode(options: CustomNodeOptions): any
export function customNode(options: string | CustomNodeOptions): any {
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
