import type { WebGLFramebufferOptions, WebGLRenderer } from '../renderer'
import { Projection2D } from '../math'
import { customNode, property } from './decorators'
import { QuadUvGeometry } from './geometries'
import { UvMaterial } from './materials'
import { Node } from './Node'
import { ViewportTexture } from './textures'

export interface ViewportFramebuffer {
  texture: ViewportTexture
  needsUpload: boolean
}

@customNode({
  tag: 'Viewport',
  renderable: true,
})
export class Viewport extends Node {
  @property({ default: 0 }) declare x: number
  @property({ default: 0 }) declare y: number
  @property({ default: 0 }) declare width: number
  @property({ default: 0 }) declare height: number

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

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'x':
      case 'y':
        this.requestUpload()
        this._projection.translate(this.x, this.y)
        break
      case 'width':
      case 'height':
        this.requestUpload()
        this._projection.resize(this.width, this.height)
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
    if (framebuffer.needsUpload) {
      framebuffer.needsUpload = false
      renderer.framebuffer.update(
        this._glFramebuffer(renderer),
        this._glFramebufferOptions(renderer),
      )
      return true
    }
    return false
  }

  activate(renderer: WebGLRenderer): void {
    renderer.flush()
    this._tree?.setCurrentViewport(this)
    renderer.framebuffer.bind(this._glFramebuffer(renderer))
    this.upload(renderer)
  }

  redraw(renderer: WebGLRenderer, cb: () => void): void {
    renderer.flush()
    const texture = this.framebuffer.texture
    this._framebufferIndex = (this._framebufferIndex + 1) % this._framebuffers.length
    this.activate(renderer)
    renderer.clear()
    texture.activate(renderer, 0)
    cb()
  }

  activateWithCopy(renderer: WebGLRenderer, target: Viewport): void {
    this.resize(target.width, target.height)
    this.activate(renderer)
    renderer.clear()
    target.texture.activate(renderer, 0)
    QuadUvGeometry.draw(renderer, UvMaterial.instance, {
      sampler: 0,
    })
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

  toProjectionArray(transpose = false): number[] {
    return this._projection.toArray(transpose)
  }
}
