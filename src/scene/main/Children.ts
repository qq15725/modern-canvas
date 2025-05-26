import type { InternalMode, Node } from './Node'

export class Children<T extends Node = Node> extends Array<T> {
  readonly front: T[] = []
  readonly back: T[] = []

  get internal(): T[] {
    return [
      ...this.front,
      ...this,
      ...this.back,
    ]
  }

  constructor(...items: T[]) {
    super()
    this.set(items)
  }

  set(items: T[]): this {
    this.front.length = 0
    this.length = 0
    this.back.length = 0
    items.forEach((item) => {
      switch (item.internalMode) {
        case 'front':
          this.front.push(item)
          break
        case 'default':
          this.push(item)
          break
        case 'back':
          this.back.push(item)
          break
      }
    })
    return this
  }

  getInternal(includeInternal: InternalMode): T[] {
    switch (includeInternal) {
      case 'front':
        return this.front
      case 'default':
        return this
      case 'back':
        return this.back
      default:
        throw new Error(`Unknown internal mode: ${includeInternal}`)
    }
  }

  toJSON(): T[] {
    return [...this]
  }
}
