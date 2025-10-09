import type { RefCountedEvents } from '../object'
import { RefCounted } from '../object'

export interface ResourceEvents extends RefCountedEvents {
  //
}

export interface Resource {
  on: <K extends keyof ResourceEvents & string>(event: K, listener: (...args: ResourceEvents[K]) => void) => this
  once: <K extends keyof ResourceEvents & string>(event: K, listener: (...args: ResourceEvents[K]) => void) => this
  off: <K extends keyof ResourceEvents & string>(event: K, listener: (...args: ResourceEvents[K]) => void) => this
  emit: <K extends keyof ResourceEvents & string>(event: K, ...args: ResourceEvents[K]) => this
}

export class Resource extends RefCounted {
  //
}
