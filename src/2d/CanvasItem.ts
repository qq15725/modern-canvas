import type { ColorValue } from '../color'
import type { NodeOptions, PropertyDeclaration } from '../core'
import type { WebGLBlendMode, WebGLRenderer } from '../renderer'
import type { CanvasBatchable } from './CanvasContext'
import type { Style2DOptions } from './Style2D'
import { Color } from '../color'
import { customNode, Node, property } from '../core'
import { clamp } from '../math'
import { CanvasContext } from './CanvasContext'
import { Style2D } from './Style2D'

export interface CanvasItemOptions extends NodeOptions {
  style?: Style2DOptions
  tint?: string
  blendMode?: WebGLBlendMode
}

@customNode('CanvasItem')
export class CanvasItem extends Node {
  @property() tint?: ColorValue
  @property() blendMode?: WebGLBlendMode

  protected declare _style: Style2D
  get style(): Style2D { return this._style }
  set style(style) {
    style.on('updateProperty', this._onUpdateStyleProperty)
    this._style?.off('updateProperty', this._onUpdateStyleProperty)
    this._style = style
  }

  /** @internal */
  opacity = 1

  protected _parentOpacity?: number
  protected _tint = new Color(0xFFFFFFFF)
  protected _backgroundColor = new Color(0x00000000)

  // 2d batch render
  context = new CanvasContext()
  protected _resetContext = true
  protected _waitingRedraw = false
  protected _waitingReflow = false
  protected _waitingRepaint = false
  protected _originalBatchables: CanvasBatchable[] = []
  protected _layoutedBatchables: CanvasBatchable[] = []
  protected _batchables: CanvasBatchable[] = []

  constructor(options?: CanvasItemOptions) {
    super()
    this._onUpdateStyleProperty = this._onUpdateStyleProperty.bind(this)
    this.setProperties(options)
    this.style = new Style2D()
  }

  override setProperties(properties?: Record<PropertyKey, any>): this {
    if (properties) {
      const { style, ...restProperties } = properties
      style && this.style.setProperties(style)
      super.setProperties(restProperties)
    }
    return this
  }

  protected override _onUpdateProperty(key: PropertyKey, newValue: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._onUpdateProperty(key, newValue, oldValue, declaration)

    switch (key) {
      case 'blendMode':
        this.requestRepaint()
        break
      case 'tint':
        this._tint.value = newValue || 0xFFFFFFFF
        this.requestRepaint()
        break
    }
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _onUpdateStyleProperty(key: PropertyKey, newValue: any, oldValue: any, declaration?: PropertyDeclaration): void {
    switch (key) {
      case 'backgroundColor':
        this._backgroundColor.value = newValue || 0x00000000
        if (this._originalBatchables.length) {
          this.requestRepaint()
        }
        else if (this._backgroundColor.a > 0) {
          this.requestRedraw()
        }
        break
      case 'opacity':
        this._updateOpacity()
        break
      case 'filter':
        this.requestRepaint()
        break
    }
  }

  protected _updateOpacity(): void {
    const opacity = clamp(0, this.style.opacity, 1)
      * ((this._parent as CanvasItem)?.opacity ?? 1)
    if (this.opacity !== opacity) {
      this.opacity = opacity
      this.requestRepaint()
    }
  }

  override isVisible(): boolean {
    return this.opacity > 0 && super.isVisible()
  }

  requestRedraw(): void { this._waitingRedraw = true }
  requestReflow(): void { this._waitingReflow = true }
  requestRepaint(): void { this._waitingRepaint = true }

  protected override _process(delta: number): void {
    const parentOpacity = (this._parent as CanvasItem)?.opacity
    if (parentOpacity !== this._parentOpacity) {
      this._parentOpacity = parentOpacity
      this._updateOpacity()
    }

    super._process(delta)
  }

  protected _draw(): void {
    /** override */
  }

  protected _relayout(batchables: CanvasBatchable[]): CanvasBatchable[] {
    return this._reflow(batchables)
  }

  protected _reflow(batchables: CanvasBatchable[]): CanvasBatchable[] {
    return this._repaint(batchables)
  }

  protected _repaint(batchables: CanvasBatchable[]): CanvasBatchable[] {
    const colorMatrix = this.style.getComputedFilterColorMatrix()
    return batchables.map((batchable) => {
      return {
        ...batchable,
        backgroundColor: this._backgroundColor.abgr,
        tint: this._tint.toArgb(this.opacity, true),
        colorMatrix: colorMatrix.toMatrix4().toArray(true),
        colorMatrixOffset: colorMatrix.toVector4().toArray(),
        blendMode: this.blendMode,
      }
    })
  }

  protected override _render(renderer: WebGLRenderer): void {
    let batchables: CanvasBatchable[] | undefined
    if (this._waitingRedraw) {
      this._draw()
      this._originalBatchables = this.context.toBatchables()
      this._layoutedBatchables = this._relayout(this._originalBatchables)
      batchables = this._layoutedBatchables
      if (this._resetContext) {
        this.context.reset()
      }
    }
    else if (this._waitingReflow) {
      this._layoutedBatchables = this._reflow(this._originalBatchables)
      batchables = this._layoutedBatchables
    }
    else if (this._waitingRepaint) {
      batchables = this._repaint(this._layoutedBatchables)
    }

    if (batchables) {
      this._batchables = batchables
      this._waitingRedraw = false
      this._waitingReflow = false
      this._waitingRepaint = false
    }

    this._batchables.forEach((batchable) => {
      batchable.texture?.upload(renderer)

      renderer.batch2D.render({
        ...batchable,
        texture: batchable.texture?._glTexture(renderer),
      })
    })

    super._render(renderer)
  }

  override toJSON(): Record<string, any> {
    const json = super.toJSON()
    return {
      ...json,
      props: {
        style: this.style.toJSON(),
        ...json.props,
      },
    }
  }
}
