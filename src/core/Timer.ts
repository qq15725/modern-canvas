import type { NodeOptions } from './Node'
import { clamp } from '../math'
import { customNode, property } from './decorators'
import { Node } from './Node'

export interface TimerOptions extends NodeOptions {
  start?: number
  current?: number
  end?: number
  loop?: boolean
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

  constructor(options?: TimerOptions) {
    super()
    options && this.setProperties(options)
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
