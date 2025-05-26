import type { InternalMode } from './Node'

export class Children<T> extends Array<T> {
  readonly front: T[] = []
  readonly back: T[] = []

  get internal(): T[] {
    return [
      ...this.front,
      ...this,
      ...this.back,
    ]
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
}
