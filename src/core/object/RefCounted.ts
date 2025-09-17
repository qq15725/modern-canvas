import type { CoreObjectEvents } from './CoreObject'
import { CoreObject } from './CoreObject'

export interface RefCountedEvents extends CoreObjectEvents {
  //
}

export interface RefCounted {
  on: <K extends keyof RefCountedEvents & string>(event: K, listener: RefCountedEvents[K]) => this
  once: <K extends keyof RefCountedEvents & string>(event: K, listener: RefCountedEvents[K]) => this
  off: <K extends keyof RefCountedEvents & string>(event: K, listener: RefCountedEvents[K]) => this
  emit: <K extends keyof RefCountedEvents & string>(event: K, ...args: Parameters<RefCountedEvents[K]>) => this
}

export class RefCounted extends CoreObject {
  //
}
