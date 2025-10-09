import type { CoreObjectEvents } from './CoreObject'
import { CoreObject } from './CoreObject'

export interface RefCountedEvents extends CoreObjectEvents {
  //
}

export interface RefCounted {
  on: <K extends keyof RefCountedEvents & string>(event: K, listener: (...args: RefCountedEvents[K]) => void) => this
  once: <K extends keyof RefCountedEvents & string>(event: K, listener: (...args: RefCountedEvents[K]) => void) => this
  off: <K extends keyof RefCountedEvents & string>(event: K, listener: (...args: RefCountedEvents[K]) => void) => this
  emit: <K extends keyof RefCountedEvents & string>(event: K, ...args: RefCountedEvents[K]) => this
}

export class RefCounted extends CoreObject {
  //
}
