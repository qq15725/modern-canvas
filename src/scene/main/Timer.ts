import type { EventListenerOptions, EventListenerValue } from '../../core'
import type { NodeEventMap, NodeProperties } from './Node'
import { clamp, customNode, property } from '../../core'
import { Node } from './Node'

export interface TimerEventMap extends NodeEventMap {
  update: (current: number, delta: number) => void
}

export interface Timer {
  on: (<K extends keyof TimerEventMap>(type: K, listener: TimerEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof TimerEventMap>(type: K, listener: TimerEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof TimerEventMap>(type: K, ...args: Parameters<TimerEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export interface TimerProperties extends NodeProperties {
  start: number
  current: number
  end: number
  loop: boolean
}

@customNode('Timer')
export class Timer extends Node {
  @property({ default: 0 }) declare start: number
  @property({ default: 0 }) declare current: number
  @property({ default: Number.MAX_SAFE_INTEGER }) declare end: number
  @property({ default: false }) declare loop: boolean

  static from(range: number | number[]): Timer {
    const [start, end] = range
      ? Array.isArray(range)
        ? range
        : [0, range]
      : []
    return new Timer({
      start,
      end,
    })
  }

  constructor(properties?: Partial<TimerProperties>) {
    super()
    this.setProperties(properties)
  }

  protected _onUpdateProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'start':
        this.start = Math.min(value, this.end)
        break
      case 'end':
        this.end = value || Number.MAX_SAFE_INTEGER
        break
    }
  }

  addTime(delta: number): this {
    const start = this.start
    const end = this.end
    let current = this.current + delta
    if (this.loop && current > end) {
      current = start + (current % end)
    }
    this.current = clamp(start, current, end)
    this.emit('update', this.current, delta)
    return this
  }

  protected _process(delta: number): void {
    super._process(delta)
    this.addTime(delta)
  }
}
