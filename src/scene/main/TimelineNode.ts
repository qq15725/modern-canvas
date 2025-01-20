import type {
  EventListenerOptions,
  EventListenerValue,
} from '../../core'
import type { NodeEventMap, NodeProperties } from './Node'
import type { Timeline } from './Timeline'
import {
  clamp,
  customNode,
  property,
} from '../../core'
import { Node } from './Node'

export interface TimelineNodeProperties extends NodeProperties {
  delay: number
  duration: number
  paused: boolean
}

export interface TimelineNodeEventMap extends NodeEventMap {
  updateCurrentTime: (currentTime: number) => void
}

export interface TimelineNode {
  on: (<K extends keyof TimelineNodeEventMap>(type: K, listener: TimelineNodeEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  once: (<K extends keyof TimelineNodeEventMap>(type: K, listener: TimelineNodeEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof TimelineNodeEventMap>(type: K, listener?: TimelineNodeEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof TimelineNodeEventMap>(type: K, ...args: Parameters<TimelineNodeEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

@customNode('TimelineNode')
export class TimelineNode extends Node {
  @property({ default: 0 }) declare delay: number
  @property({ default: 0 }) declare duration: number
  @property({ default: false }) declare paused: boolean

  constructor(properties?: Partial<TimelineNodeProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  /** Timeline */
  computedDuration = 0
  protected _currentTime = 0
  protected _startTime = 0
  get timeline(): Timeline | undefined { return this._tree?.timeline }
  get timelineCurrentTime(): number { return this.timeline?.currentTime ?? 0 }
  get parentStartTime(): number { return (this._parent as TimelineNode)?.startTime ?? 0 }
  get currentTime(): number { return clamp(0, this._currentTime, this.computedDuration) }
  get startTime(): number { return this._startTime }
  set startTime(val: number) {
    this.delay = val - this.parentStartTime
    this._updateCurrentTime(true)
  }

  get endTime(): number { return this._startTime + this.computedDuration }
  get currentTimeProgress(): number { return this.computedDuration ? clamp(0, this._currentTime / this.computedDuration, 1) : 0 }
  isInsideTimeRange(): boolean {
    const current = this._currentTime
    if (this.computedDuration) {
      return current >= 0 && current <= this.computedDuration
    }
    else {
      return current >= 0
    }
  }

  protected _updateCurrentTime(force = false): void {
    if (force || !this.paused) {
      const parent = this._parent as TimelineNode
      this._startTime = this.delay + this.parentStartTime
      this.computedDuration = parent?.computedDuration
        ? Math.min(this._startTime + this.duration, parent.endTime) - this._startTime
        : this.duration
      this._currentTime = this.timelineCurrentTime - this._startTime
      this.emit('updateCurrentTime', this._currentTime)
    }
  }

  protected _process(delta: number): void {
    this._updateCurrentTime()
    super._process(delta)
  }
}
