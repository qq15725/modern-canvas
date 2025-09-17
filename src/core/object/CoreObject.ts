import type { ReactivableEvents } from 'modern-idoc'
import { Reactivable } from 'modern-idoc'
import { nextTick } from '../global'

export interface CoreObjectEvents extends ReactivableEvents {
  //
}

export interface CoreObject {
  on: <K extends keyof CoreObjectEvents & string>(event: K, listener: CoreObjectEvents[K]) => this
  once: <K extends keyof CoreObjectEvents & string>(event: K, listener: CoreObjectEvents[K]) => this
  off: <K extends keyof CoreObjectEvents & string>(event: K, listener: CoreObjectEvents[K]) => this
  emit: <K extends keyof CoreObjectEvents & string>(event: K, ...args: Parameters<CoreObjectEvents[K]>) => this
}

let IID = 0

export class CoreObject extends Reactivable {
  readonly instanceId = ++IID

  protected override _nextTick(): Promise<void> {
    return nextTick()
  }

  equal(target: CoreObject | undefined | null): boolean {
    return Boolean(target && this.instanceId === target.instanceId)
  }
}
