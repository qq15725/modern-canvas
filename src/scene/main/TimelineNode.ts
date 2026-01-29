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
  insideTimeRange = false

  /** Timeline */
  protected get _timeline(): Timeline | undefined { return this._tree?.timeline }
  protected get _globalCurrentTime(): number { return this._timeline?.currentTime ?? 0 }
  protected _loop = false
  protected _delay = 0
  protected _duration = 0
  protected _paused = false
  protected _currentTime = 0
  protected _globalStartTime = 0
  protected _globalDuration = 0
  get parentGlobalStartTime(): number { return (this._parent as TimelineNode)?.globalStartTime ?? 0 }
  get currentTime(): number { return this._currentTime }
  get globalStartTime(): number { return this._globalStartTime }
  get globalDuration(): number { return this._globalDuration }
  get globalEndTime(): number { return this._globalStartTime + this._globalDuration }
  get currentTimeProgress(): number { return this._duration ? clamp(this._currentTime / this._duration, 0, 1) : 0 }
  isInsideTimeRange(): boolean {
    const current = this._currentTime
    if (this._globalDuration) {
      return current >= 0 && current <= this._globalDuration
    }
    else {
      return current >= 0
    }
  }

  constructor(properties?: Partial<TimelineNodeProperties>, nodes: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(nodes)

    // TODO
    this._loop = this.loop
    this._delay = this.delay
    this._duration = this.duration
    this._paused = this.paused
  }

  protected override _updateProperty(key: string, newValue: any, oldValue: any): void {
    super._updateProperty(key, newValue, oldValue)

    switch (key) {
      case 'loop':
        this._loop = this.loop
        this._updateCurrentTime(true)
        break
      case 'delay':
        this._delay = this.delay
        this._updateCurrentTime(true)
        break
      case 'duration':
        this._duration = this.duration
        this._updateCurrentTime(true)
        break
      case 'paused':
        this._paused = this.paused
        this._updateCurrentTime(true)
        break
    }
  }

  protected _updateInsideTimeRange(): void {
    this.insideTimeRange = this.isInsideTimeRange()
  }

  protected _updateCurrentTime(force = false): void {
    if (force || !this._paused) {
      const parent = this._parent as TimelineNode
      const globalStartTime = this.parentGlobalStartTime + this._delay
      const globalDuration = parent?.globalDuration
        ? Math.min(globalStartTime + this._duration, parent.globalEndTime) - globalStartTime
        : this._duration

      this._globalStartTime = globalStartTime
      this._globalDuration = globalDuration

      let currentTime = this._globalCurrentTime - this.globalStartTime
      if (this._loop) {
        currentTime = currentTime % this.globalDuration
      }
      this._currentTime = currentTime
      this.emit('updateCurrentTime', this._currentTime)
      this._updateInsideTimeRange()
    }
  }

  protected _process(delta: number): void {
    super._process(delta)
    this._updateCurrentTime()
  }
}
