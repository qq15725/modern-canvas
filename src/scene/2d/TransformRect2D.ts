import type { PropertyDeclaration } from '../../core'
import type { Rectangulable } from '../main/interfaces'
import type { Node2DProperties } from './Node2D'
import { property } from '../../core'
import { Texture2D } from '../resources'
import { Node2D } from './Node2D'

export interface TransformRect2DProperties extends Node2DProperties {
  //
}

export class TransformRect2D extends Node2D implements Rectangulable {
  @property({ default: 6 }) declare size: number

  protected _updateStyleProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateStyleProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'width':
      case 'height':
        this.requestRedraw()
        break
    }
  }

  protected _drawCircle(x: number, y: number): void {
    this.context.arc(x, y, this.size, 0, Math.PI * 2, true)
    this.context.fillStyle = Texture2D.WHITE
    this.context.fill()

    this.context.arc(x, y, this.size, 0, Math.PI * 2, true)
    this.context.strokeStyle = 'rgba(0, 0, 0, 0.2)'
    this.context.stroke()
  }

  protected _drawEllipse(x: number, y: number): void {
    this.context.roundRect(x - this.size, y - this.size * 2, this.size * 2, this.size * 4, this.size)
    this.context.fillStyle = Texture2D.WHITE
    this.context.fill()

    this.context.roundRect(x - this.size, y - this.size * 2, this.size * 2, this.size * 4, this.size)
    this.context.strokeStyle = 'rgba(0, 0, 0, 0.2)'
    this.context.stroke()
  }

  protected override _draw(): void {
    const { width, height } = this.style
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
