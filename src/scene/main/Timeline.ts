import type { EventListenerOptions, EventListenerValue } from 'modern-idoc'
import type { NodeEventMap, NodeProperties } from './Node'
import { property } from 'modern-idoc'
import { clamp, customNode } from '../../core'
import { Node } from './Node'

export interface TimelineEventMap extends NodeEventMap {
  updateCurrentTime: (current: number, delta: number) => void
}

export interface Timeline {
  on: (<K extends keyof TimelineEventMap>(type: K, listener: TimelineEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  once: (<K extends keyof TimelineEventMap>(type: K, listener: TimelineEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof TimelineEventMap>(type: K, listener?: TimelineEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof TimelineEventMap>(type: K, ...args: Parameters<TimelineEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export interface TimelineProperties extends NodeProperties {
  startTime: number
  currentTime: number
  endTime: number
  loop: boolean
}

@customNode('Timeline')
export class Timeline extends Node {
  @property({ fallback: 0 }) declare startTime: number
  @property({ fallback: 0 }) declare currentTime: number
  @property({ fallback: Number.MAX_SAFE_INTEGER }) declare endTime: number
  @property({ fallback: false }) declare loop: boolean

  static from(range: number | number[], loop = false): Timeline {
    const [startTime, endTime] = range
      ? Array.isArray(range)
        ? range
        : [0, range]
      : []
    return new Timeline({
      startTime,
      endTime,
      loop,
    })
  }

  constructor(properties?: Partial<TimelineProperties>) {
    super()
    this.setProperties(properties)
  }

  protected _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'startTime':
        this.startTime = Math.min(value, this.endTime)
        break
      case 'endTime':
        this.endTime = value || Number.MAX_SAFE_INTEGER
        break
    }
  }

  addTime(delta: number): this {
    const start = this.startTime
    const end = this.endTime
    let current = this.currentTime
    current = current + delta
    if (this.loop && current > end) {
      current = start + (current % end)
    }
    current = clamp(current, start, end)
    this.currentTime = current
    this.emit('updateCurrentTime', current, delta)
    return this
  }

  protected _process(delta: number): void {
    super._process(delta)
    this.addTime(delta)
  }
}
