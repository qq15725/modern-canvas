import type { NodeEvents, NodeProperties } from './Node'
import type { Timeline } from './Timeline'
import { property } from 'modern-idoc'
import {
  clamp,
  customNode,
} from '../../core'
import { Node } from './Node'

export interface TimelineNodeProperties extends NodeProperties {
  delay: number
  duration: number
  paused: boolean
}

export interface TimelineNodeEvents extends NodeEvents {
  updateCurrentTime: [currentTime: number]
}

export interface TimelineNode {
  on: <K extends keyof TimelineNodeEvents & string>(event: K, listener: (...args: TimelineNodeEvents[K]) => void) => this
  once: <K extends keyof TimelineNodeEvents & string>(event: K, listener: (...args: TimelineNodeEvents[K]) => void) => this
  off: <K extends keyof TimelineNodeEvents & string>(event: K, listener: (...args: TimelineNodeEvents[K]) => void) => this
  emit: <K extends keyof TimelineNodeEvents & string>(event: K, ...args: TimelineNodeEvents[K]) => this
}

@customNode('TimelineNode')
export class TimelineNode extends Node {
  @property({ fallback: 0 }) declare delay: number
  @property({ fallback: 0 }) declare duration: number
  @property({ fallback: false }) declare paused: boolean
  @property({ internal: true, fallback: false }) declare insideTimeRange: boolean

  constructor(properties?: Partial<TimelineNodeProperties>, nodes: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(nodes)
  }

  /** Timeline */
  computedDuration = 0
  _currentTime = 0
  _startTime = 0
  get timeline(): Timeline | undefined { return this._tree?.timeline }
  get timelineCurrentTime(): number { return this.timeline?.currentTime ?? 0 }
  get parentStartTime(): number { return (this._parent as TimelineNode)?.startTime ?? 0 }
  get currentTime(): number { return clamp(this._currentTime, 0, this.computedDuration) }
  get startTime(): number { return this._startTime }
  set startTime(val: number) {
    this.delay = val - this.parentStartTime
    this._updateCurrentTime(true)
  }

  get endTime(): number { return this._startTime + this.computedDuration }
  get currentTimeProgress(): number { return this.computedDuration ? clamp(this._currentTime / this.computedDuration, 0, 1) : 0 }
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
      this.insideTimeRange = this.isInsideTimeRange()
    }
  }

  protected _process(delta: number): void {
    super._process(delta)
    this._updateCurrentTime()
  }
}
