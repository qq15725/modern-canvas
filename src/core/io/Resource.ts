import type { RefCountedEvents } from '../object'
import { RefCounted } from '../object'

export interface ResourceEvents extends RefCountedEvents {
  //
}

export interface Resource {
  on: <K extends keyof ResourceEvents & string>(event: K, listener: ResourceEvents[K]) => this
  once: <K extends keyof ResourceEvents & string>(event: K, listener: ResourceEvents[K]) => this
  off: <K extends keyof ResourceEvents & string>(event: K, listener: ResourceEvents[K]) => this
  emit: <K extends keyof ResourceEvents & string>(event: K, ...args: Parameters<ResourceEvents[K]>) => this
}

export class Resource extends RefCounted {
  //
}
