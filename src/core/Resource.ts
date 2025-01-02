import type { EventListenerOptions, EventListenerValue } from '../shared'
import type { ReferenceEventMap } from './Reference'
import { Reference } from './Reference'

export interface ResourceEventMap extends ReferenceEventMap {
  //
}

export interface Resource {
  on: (<K extends keyof ResourceEventMap>(type: K, listener: ResourceEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof ResourceEventMap>(type: K, listener: ResourceEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof ResourceEventMap>(type: K, ...args: Parameters<ResourceEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

/**
 * Resource 是继承自 Reference 的类，是所有资源类型的基类。
 * 它用于存储各种可重用的资源，如纹理、材质、音效、脚本等。
 * Resource 类的主要功能是为资源提供序列化和管理支持，使得这些资源能够被保存、加载和共享。
 *
 * 功能和用途：
 *  • 序列化支持：Resource 支持将资源序列化为文件并保存到磁盘，通常以 .tres 或 .res 格式存储。
 *  • 资源加载和引用：可以在多个地方引用同一个资源实例，资源本身是共享的。当一个 Resource 实例被加载时，它不会创建多个副本，而是通过引用计数来管理其生命周期。
 *  • 可重用性：资源是可以在多个场景中共享的，例如一个纹理资源可以在多个 Sprite 节点中使用，而不需要重新加载。
 */
export class Resource extends Reference {
  //
}
