import type {
  EventListenerOptions,
  EventListenerValue,
  PropertyDeclaration, WebGLFramebufferOptions, WebGLRenderer,
} from '../../core'
import type { Rectangulable, RectangulableEventMap } from './interfaces'
import type { NodeEventMap } from './Node'
import { customNode, Projection2D, property, Rect2 } from '../../core'
import { QuadUvGeometry, UvMaterial, ViewportTexture } from '../resources'
import { Node } from './Node'

export interface ViewportEventMap extends NodeEventMap, RectangulableEventMap {
  //
}

export interface Viewport {
  on: (<K extends keyof ViewportEventMap>(type: K, listener: ViewportEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  once: (<K extends keyof ViewportEventMap>(type: K, listener: ViewportEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof ViewportEventMap>(type: K, listener?: ViewportEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof ViewportEventMap>(type: K, ...args: Parameters<ViewportEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export interface ViewportFramebuffer {
  texture: ViewportTexture
  needsUpload: boolean
}

@customNode('Viewport')
export class Viewport extends Node implements Rectangulable {
  @property({ default: 0 }) declare x: number
  @property({ default: 0 }) declare y: number
  @property({ default: 0 }) declare width: number
  @property({ default: 0 }) declare height: number

  get valid(): boolean { return Boolean(this.width && this.height) }

  protected _projection = new Projection2D()
  protected _framebufferIndex = 0
  protected _framebuffers: ViewportFramebuffer[] = [
    { texture: new ViewportTexture(), needsUpload: false },
    { texture: new ViewportTexture(), needsUpload: false },
  ]

  get framebuffer(): ViewportFramebuffer { return this._framebuffers[this._framebufferIndex] }
  get texture(): ViewportTexture { return this.framebuffer.texture }

  constructor(
    public flipY = false,
  ) {
    super()
    this._projection.flipY(flipY)
  }

  /** @internal */
  _glFramebufferOptions(renderer: WebGLRenderer): WebGLFramebufferOptions {
    const { width, height } = this
    const { pixelRatio } = renderer

    this._framebuffers.forEach((framebuffer) => {
      const texture = framebuffer.texture
      texture.pixelRatio = pixelRatio
      texture.width = width
      texture.height = height
      texture.upload(renderer)
    })

    return {
      width,
      height,
      colorTextures: [this.texture._glTexture(renderer)],
    }
  }

  /** @internal */
  _glFramebuffer(renderer: WebGLRenderer): WebGLFramebuffer {
    return renderer.getRelated(this.framebuffer, () => {
      return renderer.framebuffer.create(
        this._glFramebufferOptions(renderer),
      )
    })
  }

  protected _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'x':
      case 'y':
        this.requestUpload()
        this._projection.translate(this.x, this.y)
        this.emit('updateRect')
        break
      case 'width':
      case 'height':
        this.requestUpload()
        this._projection.resize(this.width, this.height)
        this.emit('updateRect')
        break
    }
  }

  requestUpload(): void {
    this._framebuffers.forEach(framebuffer => framebuffer.needsUpload = true)
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  upload(renderer: WebGLRenderer): boolean {
    const framebuffer = this.framebuffer
    if (framebuffer.needsUpload && this.valid) {
      framebuffer.needsUpload = false
      renderer.framebuffer.update(
        this._glFramebuffer(renderer),
        this._glFramebufferOptions(renderer),
      )
      return true
    }
    return false
  }

  activate(renderer: WebGLRenderer): boolean {
    if (this.valid) {
      renderer.flush()
      this._tree?.setCurrentViewport(this)
      renderer.framebuffer.bind(this._glFramebuffer(renderer))
      this.upload(renderer)
      return true
    }
    return false
  }

  redraw(renderer: WebGLRenderer, cb: () => void): boolean {
    if (this.valid) {
      renderer.flush()
      const texture = this.framebuffer.texture
      this._framebufferIndex = (this._framebufferIndex + 1) % this._framebuffers.length
      this.activate(renderer)
      renderer.clear()
      texture.activate(renderer, 0)
      cb()
      return true
    }
    return false
  }

  activateWithCopy(renderer: WebGLRenderer, target: Viewport): void {
    this.resize(target.width, target.height)
    if (this.activate(renderer)) {
      renderer.clear()
      target.texture.activate(renderer, 0)
      QuadUvGeometry.draw(renderer, UvMaterial.instance, {
        sampler: 0,
      })
    }
  }

  override render(renderer: WebGLRenderer, next?: () => void): void {
    // render before
    const oldViewport = this._tree?.getCurrentViewport()
    this.activate(renderer)
    renderer.clear()

    super.render(renderer, next)

    // render after
    renderer.flush()
    if (oldViewport) {
      oldViewport.activate(renderer)
    }
    else {
      renderer.framebuffer.bind(null)
      this._tree?.setCurrentViewport(undefined)
    }
  }

  getRect(): Rect2 {
    return new Rect2(this.x, this.y, this.width, this.height)
  }

  toProjectionArray(transpose = false): number[] {
    return this._projection.toArray(transpose)
  }
}
