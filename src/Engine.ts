import type {
  ColorValue,
  EventListenerOptions,
  EventListenerValue,
  PointerInputEvent,
  WheelInputEvent,
} from './core'
import type { Timeline } from './scene'
import { assets } from './asset'
import {
  DEVICE_PIXEL_RATIO,
  nextTick,
  SUPPORTS_RESIZE_OBSERVER,
  WebGLRenderer,
} from './core'
import { SceneTree } from './scene'

export interface EngineOptions extends WebGLContextAttributes {
  debug?: boolean
  view?: HTMLCanvasElement | WebGLRenderingContext | WebGL2RenderingContext
  width?: number
  height?: number
  pixelRatio?: number
  backgroundColor?: ColorValue
  autoResize?: boolean
  autoStart?: boolean
  timeline?: Timeline
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
  once: (<K extends keyof EngineEventMap>(type: K, listener: EngineEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof EngineEventMap>(type: K, listener?: EngineEventMap[K], options?: EventListenerOptions) => this)
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
      debug = false,
      view,
      width,
      height,
      pixelRatio = DEVICE_PIXEL_RATIO,
      backgroundColor = 0x00000000,
      autoResize,
      autoStart,
      timeline,
      ...glOptions
    } = options

    super(timeline)

    this.debug = debug

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

    autoStart && this.start()
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
          this.root.input(event, key as any)
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

  async waitUntilLoad(): Promise<void> {
    await assets.waitUntilLoad()
    await this.nextTick()
  }

  async waitAndRender(delta = 0): Promise<void> {
    this._process(delta)
    await this.waitUntilLoad()
    this._render(this.renderer)
  }

  render(delta = 0): void {
    this._process(delta)
    this._render(this.renderer)
  }

  override async start(): Promise<void> {
    await this.waitAndRender()
    super.start((delta) => {
      this._process(delta)
      this._render(this.renderer)
    })
  }

  override free(): void {
    super.free()
    this.enableAutoResize(false)
    this.renderer.free()
  }

  toPixels(): Uint8ClampedArray {
    return this.renderer.toPixels()
  }

  toImageData(): ImageData {
    return new ImageData(this.toPixels(), this.gl.drawingBufferWidth, this.gl.drawingBufferHeight)
  }

  toCanvas2D(): HTMLCanvasElement {
    const imageData = this.toImageData()
    const canvas1 = document.createElement('canvas')
    canvas1.width = imageData.width
    canvas1.height = imageData.height
    canvas1.getContext('2d')?.putImageData(imageData, 0, 0)
    const canvas2 = document.createElement('canvas')
    canvas2.width = this.width
    canvas2.height = this.height
    canvas2.getContext('2d')?.drawImage(
      canvas1,
      0, 0, canvas1.width, canvas1.height,
      0, 0, canvas2.width, canvas2.height,
    )
    return canvas2
  }
}
