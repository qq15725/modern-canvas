import type {
  GlRenderer,
  RectangleLike,
  Vector2, Vector2Like,
} from '../../core'
import type { Texture2D } from '../resources'
import type { Rectangulable, RectangulableEvents } from './interfaces'
import type { NodeEvents } from './Node'
import { property } from 'modern-idoc'
import { customNode, Rectangle, Transform2D } from '../../core'
import { QuadUvGeometry, RenderTarget, UvMaterial } from '../resources'
import { Node } from './Node'

export interface ViewportEvents extends NodeEvents, RectangulableEvents {
  //
}

export interface Viewport {
  on: <K extends keyof ViewportEvents & string>(event: K, listener: (...args: ViewportEvents[K]) => void) => this
  once: <K extends keyof ViewportEvents & string>(event: K, listener: (...args: ViewportEvents[K]) => void) => this
  off: <K extends keyof ViewportEvents & string>(event: K, listener: (...args: ViewportEvents[K]) => void) => this
  emit: <K extends keyof ViewportEvents & string>(event: K, ...args: ViewportEvents[K]) => this
}

@customNode('Viewport')
export class Viewport extends Node implements Rectangulable {
  readonly canvasTransform = new Transform2D()

  renderTargetIndex = 0
  readonly renderTargets: RenderTarget[] = [
    new RenderTarget(),
    new RenderTarget(),
  ]

  @property({ fallback: 0 }) declare x: number
  @property({ fallback: 0 }) declare y: number
  @property({ fallback: 0 }) declare width: number
  @property({ fallback: 0 }) declare height: number
  @property({ fallback: 0 }) declare mipLevel: number
  @property({ fallback: false }) declare msaa: boolean

  get valid(): boolean { return Boolean(this.width && this.height) }
  get renderTarget(): RenderTarget { return this.renderTargets[this.renderTargetIndex] }
  get previousRenderTarget(): RenderTarget { return this.renderTargets[(this.renderTargetIndex + 1) % this.renderTargets.length] }
  get texture(): Texture2D<null> { return this.renderTarget.colorTexture }

  override getViewport(): Viewport {
    return this
  }

  protected _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'x':
      case 'y':
      case 'width':
      case 'height':
        this.emit('updateRect')
        break
    }

    this.renderTargets?.forEach((renderTarget) => {
      (renderTarget as any)[key] = value
    })
  }

  flush(renderer: GlRenderer): void {
    renderer.flush()
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  activate(renderer: GlRenderer, frame?: RectangleLike): boolean {
    if (this.valid) {
      this.flush(renderer)
      this.renderTarget.activate(renderer, frame)
      renderer.shader.uniforms.viewMatrix = this.canvasTransform.toArray(true)
      this._tree?.setCurrentViewport(this)
      return true
    }
    return false
  }

  redraw(renderer: GlRenderer, cb: () => void): boolean {
    if (this.valid) {
      const texture = this.texture
      this.renderTargetIndex = (this.renderTargetIndex + 1) % this.renderTargets.length
      this.flush(renderer)
      this.activate(renderer)
      renderer.clear()
      texture.activate(renderer, 0)
      cb()
      return true
    }
    return false
  }

  activateWithCopy(renderer: GlRenderer, target: Viewport): void {
    this.resize(target.width, target.height)
    if (this.activate(renderer)) {
      renderer.clear()
      target.texture.activate(renderer, 0)
      QuadUvGeometry.draw(renderer, UvMaterial.instance, {
        sampler: 0,
      })
    }
  }

  renderStart(renderer: GlRenderer, frame?: RectangleLike): void {
    if (this.activate(renderer, frame)) {
      renderer.clear()
    }
  }

  renderEnd(renderer: GlRenderer, oldViewport: Viewport | undefined): void {
    this.flush(renderer)
    if (oldViewport) {
      oldViewport?.activate(renderer)
    }
    else {
      renderer.renderTarget.unbind()
      this._tree?.setCurrentViewport(undefined)
    }
  }

  override render(renderer: GlRenderer, next?: () => void): void {
    const oldViewport = this._tree?.getCurrentViewport()
    this.renderStart(renderer)
    super.render(renderer, next)
    this.renderEnd(renderer, oldViewport)
  }

  getRect(): Rectangle {
    return new Rectangle(this.x, this.y, this.width, this.height)
  }

  toCanvasGlobal<P extends Vector2Like = Vector2>(screenPos: Vector2Like, newPos?: P): P {
    return this.canvasTransform.applyAffineInverse(screenPos, newPos)
  }

  toCanvasScreen<P extends Vector2Like = Vector2>(globalPos: Vector2Like, newPos?: P): P {
    return this.canvasTransform.apply(globalPos, newPos)
  }
}
