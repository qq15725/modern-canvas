import type { NodeEvents, NodeProperties } from './Node'
import type { Timeline } from './Timeline'
import { property } from 'modern-idoc'
import {
  clamp,
  customNode,
} from '../../core'
import { Node } from './Node'

export interface TimelineNodeProperties extends NodeProperties {
  loop: boolean
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
  @property({ fallback: false }) declare loop: boolean
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
  protected get _timeline(): Timeline | undefined { return this._tree?.timeline }
  protected get _globalCurrentTime(): number { return this._timeline?.currentTime ?? 0 }
  protected _currentTime = 0
  protected _duration = 0
  protected _globalStartTime = 0
  get parentGlobalStartTime(): number { return (this._parent as TimelineNode)?.globalStartTime ?? 0 }
  get currentTime(): number { return this._currentTime }
  get globalStartTime(): number { return this._globalStartTime }
  get globalEndTime(): number { return this._globalStartTime + this._duration }
  get currentTimeProgress(): number { return this._duration ? clamp(this._currentTime / this._duration, 0, 1) : 0 }
  isInsideTimeRange(): boolean {
    const current = this._currentTime
    if (this._duration) {
      return current >= 0 && current <= this._duration
    }
    else {
      return current >= 0
    }
  }

  protected override _updateProperty(key: string, newValue: any, oldValue: any): void {
    super._updateProperty(key, newValue, oldValue)

    switch (key) {
      case 'loop':
      case 'delay':
      case 'duration':
        this._updateCurrentTime(true)
        break
    }
  }

  protected _updateCurrentTime(force = false): void {
    if (force || !this.paused) {
      const parent = this._parent as TimelineNode
      const globalStartTime = this.parentGlobalStartTime + this.delay
      const duration = parent?._duration
        ? Math.min(globalStartTime + this.duration, parent.globalEndTime) - globalStartTime
        : this.duration
      let currentTime = this._globalCurrentTime - globalStartTime
      if (this.loop) {
        currentTime = currentTime % duration
      }
      this._globalStartTime = globalStartTime
      this._currentTime = currentTime
      this._duration = duration
      this.emit('updateCurrentTime', this._currentTime)
      this.insideTimeRange = this.isInsideTimeRange()
    }
  }

  protected _process(delta: number): void {
    super._process(delta)
    this._updateCurrentTime()
  }
}
