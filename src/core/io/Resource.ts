import type { EventListenerOptions, EventListenerValue } from 'modern-idoc'
import type { RefCountedEventMap } from '../object'
import { RefCounted } from '../object'

export interface ResourceEventMap extends RefCountedEventMap {
  //
}

export interface Resource {
  on: (<K extends keyof ResourceEventMap>(type: K, listener: ResourceEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  once: (<K extends keyof ResourceEventMap>(type: K, listener: ResourceEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof ResourceEventMap>(type: K, listener?: ResourceEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof ResourceEventMap>(type: K, ...args: Parameters<ResourceEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export class Resource extends RefCounted {
  //
}
