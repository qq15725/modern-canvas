import type { Node } from '../main'
import type { VideoTexture } from '../resources'
import type { TextureRect2DProperties } from './TextureRect2D'
import { property } from 'modern-idoc'
import { assets } from '../../asset'
import { clamp, customNode } from '../../core'
import { TextureRect2D } from './TextureRect2D'

export interface Video2DProperties extends TextureRect2DProperties {
  src: string
}

@customNode('Video2D')
export class Video2D extends TextureRect2D<VideoTexture> {
  @property({ fallback: '' }) declare src: string

  get videoDuration(): number { return (this.texture?.duration ?? 0) * 1000 }

  protected _wait = Promise.resolve()
  protected _loadAbort?: AbortController

  constructor(properties?: Partial<Video2DProperties>, children: Node[] = []) {
    super()
    this.setProperties(properties)
    this.append(children)
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'src':
        this._wait = this._load(value)
        break
    }
  }

  waitLoad(): Promise<void> { return this._wait }

  protected async _load(src: string): Promise<void> {
    this._loadAbort?.abort()
    const ac = new AbortController()
    this._loadAbort = ac
    const { signal } = ac

    const texture = await assets.video.load(src)
    if (signal.aborted)
      return
    this.texture = texture
    this._updateVideoCurrentTime()
    this.requestDraw()
  }

  protected override _destroy(): void {
    this._loadAbort?.abort()
    super._destroy()
  }

  protected _updateVideoCurrentTime(): void {
    const texture = this.texture
    if (!texture)
      return
    const durationMs = this.videoDuration
    if (!durationMs)
      return

    // 可见性门控：不可见（隐藏 / 透明 / 超出时间范围）或离屏（视口裁剪）时，
    // 暂停解码器并跳过 decode/seek/upload——离屏视频不再空耗 CPU/GPU。
    // 重新可见时下方逻辑会恢复播放或 seek 到当前帧。
    if (!this.isVisibleInTree() || this._renderCulled) {
      if (!texture.paused) {
        texture.pause()
      }
      return
    }

    const targetSec = Math.max(0, this.currentTime % durationMs) / 1000

    // 连续正向播放 → 原生播放 + 漂移校正；暂停 / scrub / 反向 → 逐帧精确 seek。
    // 播放态与带符号倍速由宿主显式写入时间轴（见 Timeline.playing / playbackRate）。
    const timeline = this._timeline
    const rate = timeline?.playbackRate ?? 1
    const playingForward = Boolean(timeline?.playing) && rate > 0

    if (playingForward) {
      texture.muted = true // 自动播放策略要求静音
      texture.loop = this.loop
      texture.playbackRate = clamp(rate, 0.0625, 16)
      if (texture.paused && texture.isReady) {
        texture.play()
      }
      // 仅当漂移超阈值才 seek 校正（阈值随倍速放宽），避免逐帧 seek 的高开销。
      const drift = Math.abs(texture.currentTime - targetSec)
      if (!texture.seeking && drift > Math.max(0.3, clamp(rate, 1, 16) * 0.2)) {
        texture.currentTime = targetSec
      }
    }
    else {
      if (!texture.paused) {
        texture.pause()
      }
      if (!texture.isPlaying && !texture.seeking && texture.currentTime !== targetSec) {
        texture.currentTime = targetSec
        assets.awaitBy(() => texture.waitSeek(this._loadAbort?.signal))
      }
    }
  }

  protected override _process(delta: number): void {
    super._process(delta)
    this._updateVideoCurrentTime()
  }
}
