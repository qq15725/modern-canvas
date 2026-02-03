import type { ReactivableEvents } from 'modern-idoc'
import { Reactivable } from 'modern-idoc'
import { nextTick } from '../global'
import { instanceId } from '../shared'

export interface CoreObjectEvents extends ReactivableEvents {
  destroy: []
}

export interface CoreObject {
  on: <K extends keyof CoreObjectEvents & string>(event: K, listener: (...args: CoreObjectEvents[K]) => void) => this
  once: <K extends keyof CoreObjectEvents & string>(event: K, listener: (...args: CoreObjectEvents[K]) => void) => this
  off: <K extends keyof CoreObjectEvents & string>(event: K, listener: (...args: CoreObjectEvents[K]) => void) => this
  emit: <K extends keyof CoreObjectEvents & string>(event: K, ...args: CoreObjectEvents[K]) => this
}

export class CoreObject extends Reactivable {
  readonly instanceId = instanceId()
  destroyed = false

  get json(): Record<string, any> { return this.toJSON() }
  set json(val) { this.setProperties(val) }

  protected override _nextTick(): Promise<void> {
    return nextTick()
  }

  equal(target: CoreObject | undefined | null): boolean {
    return Boolean(target && this.instanceId === target.instanceId)
  }

  protected _destroy(): void {}

  override destroy(): void {
    if (this.destroyed)
      return
    this.destroyed = true
    this._destroy()
    this.emit('destroy')
    this.removeAllListeners()
  }
}
