import type { Node, SceneTreeEvents, SceneTreeProperties } from './scene'
import { property } from 'modern-idoc'
import { assets } from './asset'
import {
  DEVICE_PIXEL_RATIO,
  GlRenderer,
  nextTick,
  SUPPORTS_RESIZE_OBSERVER,
} from './core'
import { SceneTree } from './scene'

export type EngineData = Record<string, any> | Node | (Node | Record<string, any>)[]

export interface EngineProperties extends WebGLContextAttributes, SceneTreeProperties {
  view?: HTMLCanvasElement | WebGLRenderingContext | WebGL2RenderingContext
  width?: number
  height?: number
  pixelRatio?: number
  autoResize: boolean
  autoStart: boolean
  data?: EngineData
}

interface EngineEvents extends SceneTreeEvents {
  //
}

export interface Engine {
  on: <K extends keyof EngineEvents>(event: K, listener: (...args: EngineEvents[K]) => void) => this
  once: <K extends keyof EngineEvents>(event: K, listener: (...args: EngineEvents[K]) => void) => this
  off: <K extends keyof EngineEvents>(event: K, listener: (...args: EngineEvents[K]) => void) => this
  emit: <K extends keyof EngineEvents>(event: K, ...args: EngineEvents[K]) => this
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
  @property({ fallback: false }) declare autoResize: boolean
  @property({ fallback: false }) declare autoStart: boolean

  readonly renderer: GlRenderer
  get view(): HTMLCanvasElement | undefined { return this.renderer.view }
  get gl(): WebGLRenderingContext | WebGL2RenderingContext { return this.renderer.gl }
  get screen(): { x: number, y: number, width: number, height: number } { return this.renderer.screen }
  get width(): number { return this.screen.width }
  get height(): number { return this.screen.height }

  get pixelRatio(): number { return this.renderer.pixelRatio }
  set pixelRatio(val) {
    this.renderer.pixelRatio = val
    this.resize(this.width, this.height)
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

  constructor(properties: Partial<EngineProperties> = {}) {
    const {
      view,
      width,
      height,
      pixelRatio = DEVICE_PIXEL_RATIO,
      autoResize,
      data,
    } = properties

    super()
    this.renderer = new GlRenderer(view, {
      alpha: defaultOptions.alpha ?? properties.alpha,
      stencil: defaultOptions.stencil ?? properties.stencil,
      antialias: defaultOptions.antialias ?? properties.antialias,
      premultipliedAlpha: defaultOptions.premultipliedAlpha ?? properties.premultipliedAlpha,
      preserveDrawingBuffer: defaultOptions.preserveDrawingBuffer ?? properties.preserveDrawingBuffer,
      powerPreference: defaultOptions.powerPreference ?? properties.powerPreference,
    })
    this._setupInput()
    this.pixelRatio = pixelRatio
    if (autoResize) {
      if (!view && this.renderer.view) {
        this.renderer.view.style.width = '100%'
        this.renderer.view.style.height = '100%'
      }
    }
    else {
      this.resize(
        width || this.gl.drawingBufferWidth || this.view?.clientWidth || 200,
        height || this.gl.drawingBufferHeight || this.view?.clientHeight || 200,
        !view,
      )
    }

    this.setProperties(properties)

    if (data) {
      this.root.append(data)
    }
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'autoResize':
        if (this.view) {
          if (this.autoResize) {
            this._resizeObserver?.observe(this.view)
          }
          else {
            this._resizeObserver?.unobserve(this.view)
          }
        }
        break
      case 'autoStart':
        if (this.autoStart) {
          this.start()
        }
        break
    }
  }

  protected _setupInput(): this {
    if (this.view) {
      this.input.setTarget(this.view)

      ;[
        'pointerdown', 'pointerover', 'pointermove', 'pointerup',
        'wheel',
        'keydown', 'keypress', 'keyup',
      ].forEach((key) => {
        this.input.on(key, (event: any) => {
          this.root.input(event, key as any)
          this.emit(key, event)
        })
      })
    }

    return this
  }

  resize(width: number, height: number, updateCss = false): this {
    this.renderer.resize(width, height, updateCss)
    this.root.width = width
    this.root.height = height
    this.render()
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
    await assets.waitUntilLoad()
    this._process(delta)
    await this.nextTick()
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

  toPixels(): Uint8ClampedArray<ArrayBuffer> {
    return this.renderer.toPixels()
  }

  toImageData(): ImageData {
    return new ImageData(
      this.toPixels(),
      this.gl.drawingBufferWidth,
      this.gl.drawingBufferHeight,
    )
  }

  toCanvas2D(): HTMLCanvasElement {
    const imageData = this.toImageData()
    const canvas1 = document.createElement('canvas')
    canvas1.width = imageData.width
    canvas1.height = imageData.height
    const ctx1 = canvas1.getContext('2d')
    if (ctx1) {
      ctx1.fillStyle = 'rgba(0, 0, 0, 0)'
      ctx1.clearRect(0, 0, canvas1.width, canvas1.height)
      ctx1.putImageData(imageData, 0, 0)
    }
    const canvas2 = document.createElement('canvas')
    canvas2.width = this.width
    canvas2.height = this.height
    const ctx2 = canvas2.getContext('2d')
    if (ctx2) {
      ctx2.fillStyle = 'rgba(0, 0, 0, 0)'
      ctx2.clearRect(0, 0, canvas2.width, canvas2.height)
      ctx2.drawImage(
        canvas1,
        0, 0, canvas1.width, canvas1.height,
        0, 0, canvas2.width, canvas2.height,
      )
    }
    return canvas2
  }

  protected override _destroy(): void {
    super._destroy()
    this._resizeObserver?.disconnect()
    this.renderer.destroy()
  }
}
