import type { InternalMode, Node } from './Node'

export class Children<T extends Node = Node> {
  front: T[] = []
  default: T[] = []
  back: T[] = []

  get internal(): T[] {
    return this.getInternal()
  }

  constructor(...items: T[]) {
    this.set(items)
  }

  set(items: T[]): this {
    this.front.length = 0
    this.default.length = 0
    this.back.length = 0
    for (let len = items.length, i = 0; i < len; i++) {
      const item = items[i]
      switch (item.internalMode) {
        case 'front':
          this.front.push(item)
          break
        case 'default':
          this.default.push(item)
          break
        case 'back':
          this.back.push(item)
          break
      }
    }
    return this
  }

  getInternal(includeInternal?: InternalMode): T[] {
    if (includeInternal) {
      switch (includeInternal) {
        case 'front':
          return this.front
        case 'default':
          return this.default
        case 'back':
          return this.back
        default:
          throw new Error(`Unknown internal mode: ${includeInternal}`)
      }
    }
    else {
      const result: T[] = []
      result.push(...this.front)
      result.push(...this.default)
      result.push(...this.back)
      return result
    }
  }

  toJSON(): T[] {
    return [...this.default]
  }
}
