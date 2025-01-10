import type { CoreObjectEventMap } from './CoreObject'
import type { EventListenerOptions, EventListenerValue } from './EventEmitter'
import { CoreObject } from './CoreObject'

export interface RefCountedEventMap extends CoreObjectEventMap {
  //
}

export interface RefCounted {
  on: (<K extends keyof RefCountedEventMap>(type: K, listener: RefCountedEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof RefCountedEventMap>(type: K, listener: RefCountedEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof RefCountedEventMap>(type: K, ...args: Parameters<RefCountedEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export class RefCounted extends CoreObject {
  //
}
