import type { NodeEvents, NodeProperties } from './Node'
import { property } from 'modern-idoc'
import { clamp, customNode } from '../../core'
import { Node } from './Node'

export interface TimelineEvents extends NodeEvents {
  updateCurrentTime: [current: number, delta: number]
}

export interface Timeline {
  on: <K extends keyof TimelineEvents & string>(event: K, listener: (...args: TimelineEvents[K]) => void) => this
  once: <K extends keyof TimelineEvents & string>(event: K, listener: (...args: TimelineEvents[K]) => void) => this
  off: <K extends keyof TimelineEvents & string>(event: K, listener: (...args: TimelineEvents[K]) => void) => this
  emit: <K extends keyof TimelineEvents & string>(event: K, ...args: TimelineEvents[K]) => this
}

export interface TimelineProperties extends NodeProperties {
  startTime: number
  currentTime: number
  endTime: number
  loop: boolean
  paused: boolean
}

@customNode('Timeline')
export class Timeline extends Node {
  @property({ fallback: 0 }) declare startTime: number
  currentTime = 0
  @property({ fallback: Number.MAX_SAFE_INTEGER }) declare endTime: number
  @property({ fallback: false }) declare loop: boolean
  @property({ fallback: false }) declare paused: boolean

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

  override setProperties(properties?: Record<string, any>): this {
    if (properties) {
      const {
        currentTime,
        ...restProperties
      } = properties

      if (currentTime !== undefined) {
        this.currentTime = currentTime
      }

      super.setProperties(restProperties)
    }
    return this
  }

  addTime(delta: number): this {
    const end = this.endTime
    const start = Math.min(this.startTime, this.endTime)
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
    if (!this.paused) {
      this.addTime(delta)
    }
  }
}
