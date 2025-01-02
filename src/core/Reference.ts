import type { EventListenerOptions, EventListenerValue } from '../shared'
import type { _ObjectEventMap } from './_Object'
import { _Object } from './_Object'

export interface ReferenceEventMap extends _ObjectEventMap {
  //
}

export interface Reference {
  on: (<K extends keyof ReferenceEventMap>(type: K, listener: ReferenceEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof ReferenceEventMap>(type: K, listener: ReferenceEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof ReferenceEventMap>(type: K, ...args: Parameters<ReferenceEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

/**
 * Reference 是 Object 的子类，提供了对对象的引用计数功能。
 * 这使得它成为 Godot 中处理资源（如纹理、音频文件）和某些类的基础。
 * 与普通对象不同，Reference 类的对象会进行引用计数，直到没有任何引用时才会被销毁。
 *
 * 功能和用途：
 *  • 提供自动内存管理，避免了内存泄漏。
 *  • 经常被用作 资源类（如 Resource 和其子类）和某些非节点类型的对象。
 */
export class Reference extends _Object {
  protected _refCount = 0
}
