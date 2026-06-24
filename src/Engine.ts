import type { Node, SceneTreeEvents, SceneTreeProperties } from './scene'
import { property } from 'modern-idoc'
import { assets } from './asset'
import {
  createHTMLCanvas,
  DEVICE_PIXEL_RATIO,
  nextTick,
  planExportTiles,
  SUPPORTS_RESIZE_OBSERVER,
  WebGLRenderer,
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
    this.renderer = new WebGLRenderer(view, {
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
    this._exportWidth = 0
    this._exportHeight = 0
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
    await assets.waitUntilLoad()
    await this.nextTick()
    this._render(this.renderer)
  }

  /**
   * Like {@link waitAndRender} but without the final `_render`. Used by the
   * export pipeline, where rendering at the full (possibly oversized) logical
   * size would allocate a render target beyond the GPU limit; {@link toPixels}
   * performs the actual (tiled) rendering instead.
   */
  async waitUntilProcessed(delta = 0): Promise<void> {
    await assets.waitUntilLoad()
    this._process(delta)
    await assets.waitUntilLoad()
    await this.nextTick()
  }

  /**
   * Resize for an export pass. The requested size is remembered as the export
   * output size, but the root viewport + canvas are capped at the GPU limit:
   * the root's RenderTarget texture is reactive and re-uploads (texImage2D) on
   * every size change, so setting it beyond MAX_TEXTURE_SIZE — even just to hold
   * a "logical" size — throws `width or height out of range`. {@link toPixels}
   * tiles within the cap and stitches the full image. Does not render.
   */
  resizeForExport(width: number, height: number): this {
    const limit = this._exportTileLimit()
    this._exportWidth = Math.floor(width)
    this._exportHeight = Math.floor(height)
    this.renderer.resize(Math.min(this._exportWidth, limit), Math.min(this._exportHeight, limit), false)
    this.root.width = Math.min(this._exportWidth, limit)
    this.root.height = Math.min(this._exportHeight, limit)
    return this
  }

  render(node?: Node, delta = 0): void {
    if (node) {
      this.renderStack.push(node)
    }
    else {
      this._process(delta)
      this._render(this.renderer)
    }
  }

  override async start(): Promise<void> {
    await this.waitAndRender()
    super.start((delta) => {
      this._process(delta)
      this._render(this.renderer)
    })
  }

  /**
   * Largest dimension (in device pixels) a single offscreen render pass can
   * allocate. The root scene renders into a RenderTarget texture (plus a
   * stencil renderbuffer when masks are used) sized to the canvas, so any
   * export larger than these GPU limits throws
   * `texImage2D: width or height out of range`. Oversized exports are tiled
   * within this budget instead.
   */
  protected _maxExportPassSize(): number {
    const gl = this.gl
    const texture = this.renderer.texture.maxTextureSize
      || gl.getParameter(gl.MAX_TEXTURE_SIZE)
      || 4096
    const renderbuffer = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || texture
    const viewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array | null
    const viewport = viewportDims && viewportDims.length >= 2
      ? Math.min(viewportDims[0], viewportDims[1])
      : texture
    return Math.max(1, Math.min(texture, renderbuffer, viewport))
  }

  /** Tile budget in logical units (the GPU limit is in device pixels). */
  protected _exportTileLimit(): number {
    const pixelRatio = this.pixelRatio || 1
    return Math.max(1, Math.floor(this._maxExportPassSize() / pixelRatio))
  }

  /** Resize the renderer + root viewport without triggering a render. */
  protected _resizeSilently(width: number, height: number): void {
    this.renderer.resize(width, height, false)
    this.root.width = width
    this.root.height = height
  }

  /** Full export size (set by {@link resizeForExport}); falls back to the root size. */
  protected _exportWidth = 0
  protected _exportHeight = 0
  get exportWidth(): number { return this._exportWidth || Math.floor(this.root.width) }
  get exportHeight(): number { return this._exportHeight || Math.floor(this.root.height) }

  needsChunkReadPixels(): boolean {
    const limit = this._exportTileLimit()
    return this.exportWidth > limit || this.exportHeight > limit
  }

  toPixels(): Uint8ClampedArray<ArrayBuffer> {
    if (!this.needsChunkReadPixels()) {
      this.render()
      return this.renderer.toPixels()
    }

    const pixelRatio = this.pixelRatio || 1
    const width = this.exportWidth
    const height = this.exportHeight
    const limit = this._exportTileLimit()
    const tiles = planExportTiles(width, height, limit)

    // Output buffer is sized in device pixels, matching renderer.toPixels().
    const outWidth = Math.floor(width * pixelRatio)
    const outHeight = Math.floor(height * pixelRatio)
    const rowStride = outWidth * 4
    const pixels = new Uint8ClampedArray(outWidth * outHeight * 4)

    const baseTransform = this.root.canvasTransform.clone()

    // A single tile-sized buffer is reused for every tile: the scene is offset
    // so the tile maps to the buffer's top-left, then only the valid sub-rect
    // is read back. Keeping the size constant avoids reallocating (and
    // re-uploading) the render-target texture between tiles.
    const tileW = Math.min(width, limit)
    const tileH = Math.min(height, limit)
    this._resizeSilently(tileW, tileH)

    for (const tile of tiles) {
      this.root.canvasTransform.copyFrom(
        baseTransform.clone().translate(-tile.x, -tile.y),
      )
      this.render()

      const w = Math.floor(tile.width * pixelRatio)
      const h = Math.floor(tile.height * pixelRatio)
      const tilePixels = this.renderer.toPixels(0, 0, w, h)
      const dstX = Math.floor(tile.x * pixelRatio)
      const dstY = Math.floor(tile.y * pixelRatio)
      for (let r = 0; r < h; r++) {
        const src = r * w * 4
        const dst = (dstY + r) * rowStride + dstX * 4
        pixels.set(tilePixels.subarray(src, src + w * 4), dst)
      }
    }

    // Restore the original transform. The root viewport stays at the (capped)
    // tile size — the full export size is tracked separately (exportWidth/Height),
    // so it is never set on the root, which would re-trigger an oversized upload.
    this.root.canvasTransform.copyFrom(baseTransform)

    return pixels
  }

  toImageData(): ImageData {
    if (typeof ImageData === 'undefined') {
      throw new TypeError('toImageData requires a global ImageData; polyfill it (e.g. from node-canvas) in non-browser environments, or use toPixels() for a raw buffer.')
    }
    return new ImageData(
      this.toPixels(),
      this.exportWidth,
      this.exportHeight,
    )
  }

  toCanvas2D(imageData = this.toImageData()): HTMLCanvasElement {
    const canvas1 = createHTMLCanvas(imageData.width, imageData.height)
    const ctx1 = canvas1?.getContext('2d')
    if (canvas1 && ctx1) {
      ctx1.fillStyle = 'rgba(0, 0, 0, 0)'
      ctx1.clearRect(0, 0, canvas1.width, canvas1.height)
      ctx1.putImageData(imageData, 0, 0)
    }
    const canvas2 = createHTMLCanvas(imageData.width, imageData.height)
    if (!canvas2) {
      throw new Error('toCanvas2D requires a canvas; call setCanvasFactory() in non-browser environments.')
    }
    const ctx2 = canvas2.getContext('2d')
    if (ctx2 && canvas1) {
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
