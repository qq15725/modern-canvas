import type {
  ColorValue,
  EventListenerOptions,
  EventListenerValue,
  PointerInputEvent,
  WheelInputEvent } from '../core'
import { assets } from '../asset'
import {
  Color,
  DEVICE_PIXEL_RATIO,
  Input,
  nextTick,
  SUPPORTS_RESIZE_OBSERVER,
  WebGLRenderer,
} from '../core'
import { SceneTree } from '../scene'

export interface EngineOptions extends WebGLContextAttributes {
  view?: HTMLCanvasElement | WebGLRenderingContext | WebGL2RenderingContext
  width?: number
  height?: number
  pixelRatio?: number
  backgroundColor?: ColorValue
  autoResize?: boolean
  autoStart?: boolean
}

interface EngineEventMap {
  pointerdown: (ev: PointerInputEvent) => void
  pointerover: (ev: PointerInputEvent) => void
  pointermove: (ev: PointerInputEvent) => void
  pointerup: (ev: PointerInputEvent) => void
  wheel: (ev: WheelInputEvent) => void
}

export interface Engine {
  on: (<K extends keyof EngineEventMap>(type: K, listener: EngineEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof EngineEventMap>(type: K, listener: EngineEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof EngineEventMap>(type: K, ...args: Parameters<EngineEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export const defaultOptions = {
  alpha: true,
  stencil: true,
  antialias: false,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: 'default',
} as const

export class Engine extends SceneTree {
  readonly input = new Input()
  readonly renderer: WebGLRenderer
  get view(): HTMLCanvasElement | undefined { return this.renderer.view }
  get gl(): WebGLRenderingContext | WebGL2RenderingContext { return this.renderer.gl }
  get screen(): { x: number, y: number, width: number, height: number } { return this.renderer.screen }
  get width(): number { return this.screen.width }
  get height(): number { return this.screen.height }

  get pixelRatio(): number { return this.renderer.pixelRatio }
  set pixelRatio(val) {
    this.renderer.pixelRatio = val
    this.resize(this.width, this.height)
    if (this.view) {
      this.view.dataset.pixelRatio = String(val)
    }
  }

  protected _backgroundColor = new Color()
  get backgroundColor(): ColorValue { return this._backgroundColor.value }
  set backgroundColor(val) { this._backgroundColor.value = val }

  protected _resizeObserver = SUPPORTS_RESIZE_OBSERVER
    ? new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry.target === this.view) {
        const { inlineSize: width, blockSize: height } = Array.isArray(entry.contentBoxSize)
          ? entry.contentBoxSize[0]
          : entry.contentBoxSize
        this.resize(width, height)
      }
    })
    : undefined

  constructor(options: EngineOptions = {}) {
    const {
      view,
      width,
      height,
      pixelRatio = DEVICE_PIXEL_RATIO,
      backgroundColor = 0x00000000,
      autoResize,
      autoStart,
      ...glOptions
    } = options

    super()

    this.renderer = new WebGLRenderer(view, {
      ...defaultOptions,
      ...glOptions,
    })

    this
      ._setupInput()

    this.pixelRatio = pixelRatio
    this.backgroundColor = backgroundColor
    if (autoResize) {
      if (!view && this.renderer.view) {
        this.renderer.view.style.width = '100%'
        this.renderer.view.style.height = '100%'
      }
      this.enableAutoResize(autoResize)
    }
    else {
      this.resize(
        width || this.gl.drawingBufferWidth || this.view?.clientWidth || 200,
        height || this.gl.drawingBufferHeight || this.view?.clientHeight || 200,
        !view,
      )
    }

    if (autoStart) {
      this.start()
    }
  }

  protected _setupInput(): this {
    if (this.view) {
      this.input.setTarget(this.view)

      ;[
        'pointerdown',
        'pointerover',
        'pointermove',
        'pointerup',
        'wheel',
      ].forEach((key) => {
        this.input.on(key, (event: any) => {
          this.root.input(key as any, event)
          this.emit(key, event)
        })
      })
    }

    return this
  }

  enableAutoResize(enable = true): this {
    if (this.view) {
      if (enable) {
        this._resizeObserver?.observe(this.view)
      }
      else {
        this._resizeObserver?.unobserve(this.view)
      }
    }
    return this
  }

  resize(width: number, height: number, updateCss = false): this {
    this.renderer.resize(width, height, updateCss)
    this.root.width = width
    this.root.height = height
    this.renderer.program.uniforms.projectionMatrix = this.root.toProjectionArray(true)
    return this
  }

  nextTick(): Promise<void> {
    return nextTick()
  }

  waitUntilLoad(): Promise<void> {
    return assets.waitUntilLoad()
  }

  render(delta = 0): this {
    this.gl.clearColor(...this._backgroundColor.toArray())
    return this._render(this.renderer, delta)
  }

  override start(): this {
    this.render()
    return super.start((delta) => {
      this.render(delta)
    })
  }

  destroy(): void {
    this.stop()
    this.root.getChildren(true)
      .forEach(node => this.root.removeChild(node))
    this.input.removeEventListeners()
    this.enableAutoResize(false)
    this.renderer.destroy()
  }

  toPixels(): Uint8ClampedArray {
    this.render()
    return this.renderer.toPixels()
  }

  toImageData(): ImageData {
    return new ImageData(this.toPixels(), this.gl.drawingBufferWidth, this.gl.drawingBufferHeight)
  }

  toCanvas2D(): HTMLCanvasElement {
    const imageData = this.toImageData()
    const canvas0 = document.createElement('canvas')
    canvas0.width = imageData.width
    canvas0.height = imageData.height
    canvas0.getContext('2d')?.putImageData(imageData, 0, 0)
    const canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height
    canvas.getContext('2d')?.drawImage(
      canvas0,
      0, 0, canvas0.width, canvas0.height,
      0, 0, canvas.width, canvas.height,
    )
    return canvas
  }
}
