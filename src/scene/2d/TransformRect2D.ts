import type { Node } from '../main'
import type { BaseElement2DProperties } from './element'
import { property } from 'modern-idoc'
import { Texture2D } from '../resources'
import { Element2D } from './Element2D'

export interface TransformRect2DProperties extends BaseElement2DProperties {
  //
}

export class TransformRect2D extends Element2D {
  @property({ fallback: 6 }) declare handleSize: number

  constructor(properties?: Partial<TransformRect2DProperties>, nodes: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(nodes)
  }

  protected _updateStyleProperty(key: string, value: any, oldValue: any): void {
    super._updateStyleProperty(key, value, oldValue)

    switch (key) {
      case 'width':
      case 'height':
        this.requestRender()
        break
    }
  }

  protected _drawCircle(x: number, y: number): void {
    this.context.arc(x, y, this.handleSize, 0, Math.PI * 2, true)
    this.context.fillStyle = Texture2D.WHITE
    this.context.fill()

    this.context.arc(x, y, this.handleSize, 0, Math.PI * 2, true)
    this.context.strokeStyle = 'rgba(0, 0, 0, 0.2)'
    this.context.stroke()
  }

  protected _drawEllipse(x: number, y: number): void {
    this.context.roundRect(x - this.handleSize, y - this.handleSize * 2, this.handleSize * 2, this.handleSize * 4, this.handleSize)
    this.context.fillStyle = Texture2D.WHITE
    this.context.fill()

    this.context.roundRect(x - this.handleSize, y - this.handleSize * 2, this.handleSize * 2, this.handleSize * 4, this.handleSize)
    this.context.strokeStyle = 'rgba(0, 0, 0, 0.2)'
    this.context.stroke()
  }

  protected override _draw(): void {
    const { width, height } = this.getRect()
    this.context.rect(0, 0, width, height)
    this.context.strokeStyle = '#00FF00'
    this.context.stroke()
    this._drawCircle(0, 0)
    this._drawCircle(width, height)
    this._drawCircle(0, height)
    this._drawEllipse(0, height / 2)
    this._drawCircle(width, 0)
    this._drawEllipse(width, height / 2)
  }
}
