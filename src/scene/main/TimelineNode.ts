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
}

export interface TimelineNodeEventMap extends NodeEventMap {
  //
}

export interface TimelineNode {
  on: (<K extends keyof TimelineNodeEventMap>(type: K, listener: TimelineNodeEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof TimelineNodeEventMap>(type: K, listener: TimelineNodeEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof TimelineNodeEventMap>(type: K, ...args: Parameters<TimelineNodeEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

@customNode('TimelineNode')
export class TimelineNode extends Node {
  @property({ default: 0 }) declare delay: number
  @property({ default: 0 }) declare duration: number

  constructor(properties?: Partial<TimelineNodeProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  /** Timeline */
  computedDelay = 0
  computedDuration = 0
  get timeline(): Timeline | undefined { return this._tree?.timeline }
  get timeRange(): [number, number] { return [this.computedDelay, this.computedDelay + this.computedDuration] }
  get timeAfterDelay(): number { return (this.timeline?.currentTime ?? 0) - this.computedDelay }
  get timeProgress(): number { return clamp(0, this.timeAfterDelay / (this.computedDuration), 1) }
  isInsideTime(): boolean {
    if (!this.computedDuration)
      return true
    const [start, end] = this.timeRange
    const current = this.timeline?.currentTime ?? 0
    return current >= start && current <= end
  }

  protected _updateTime(): void {
    const parent = this._parent as TimelineNode
    this.computedDelay = this.delay + (parent?.computedDelay ?? 0)
    this.computedDuration = parent?.computedDuration
      ? Math.min(this.computedDelay + this.duration, parent.timeRange[1]) - this.computedDelay
      : this.duration
  }

  protected _onProcess(delta = 0): void {
    this._updateTime()
    super._onProcess(delta)
  }
}
