import type { Style2D } from '../Style2D'
import { defineProperty } from '../../../core'
import { DEG_TO_RAD, Transform2D } from '../../../math'
import { parseCssFunctions, PI_2 } from '../../../shared'
import { Style2DModule } from './Style2DModule'

export interface Style2DTransformProperties {
  left: number
  top: number
  width: number
  height: number
  rotate: number
  scaleX: number
  scaleY: number
  transform?: string
  transformOrigin: string
}

declare module '../Style2D' {
  interface Style2DOptions extends Partial<Style2DTransformProperties> {
    //
  }

  interface Style2D extends Style2DTransformProperties {
    getComputedTransform: typeof getComputedTransform
    getComputedTransformOrigin: typeof getComputedTransformOrigin
  }
}

export class Style2DTransformModule extends Style2DModule {
  install(Style2D: new () => Style2D): void {
    defineProperty(Style2D, 'left', { default: 0 })
    defineProperty(Style2D, 'top', { default: 0 })
    defineProperty(Style2D, 'width', { default: 0 })
    defineProperty(Style2D, 'height', { default: 0 })
    defineProperty(Style2D, 'rotate', { default: 0 })
    defineProperty(Style2D, 'scaleX', { default: 1 })
    defineProperty(Style2D, 'scaleY', { default: 1 })
    defineProperty(Style2D, 'transform')
    defineProperty(Style2D, 'transformOrigin', { default: 'center' })
    Style2D.prototype.getComputedTransform = getComputedTransform
    Style2D.prototype.getComputedTransformOrigin = getComputedTransformOrigin
  }
}

function getComputedTransform(this: Style2D): Transform2D {
  const transform = new Transform2D()
  const transform3d = new Transform2D(false)
  const transform2d = new Transform2D(false)
    .scale(this.scaleX, this.scaleY)
    .translate(this.left, this.top)
    .rotate(this.rotate * DEG_TO_RAD)

  parseCssFunctions(this.transform ?? '', { width: this.width, height: this.height })
    .forEach(({ name, args }) => {
      const values = args.map(arg => arg.normalizedIntValue)
      transform.identity()
      switch (name) {
        case 'translate':
          transform.translate((values[0]) * this.width, (values[1] ?? values[0]) * this.height)
          break
        case 'translateX':
          transform.translateX(values[0] * this.width)
          break
        case 'translateY':
          transform.translateY(values[0] * this.height)
          break
        case 'translateZ':
          transform.translateZ(values[0])
          break
        case 'translate3d':
          transform.translate3d(
            values[0] * this.width,
            (values[1] ?? values[0]) * this.height,
            values[2] ?? values[1] ?? values[0],
          )
          break
        case 'scale':
          transform.scale(values[0], values[1] ?? values[0])
          break
        case 'scaleX':
          transform.scaleX(values[0])
          break
        case 'scaleY':
          transform.scaleY(values[0])
          break
        case 'scale3d':
          transform.scale3d(values[0], values[1] ?? values[0], values[2] ?? values[1] ?? values[0])
          break
        case 'rotate':
          transform.rotate(values[0] * PI_2)
          break
        case 'rotateX':
          transform.rotateX(values[0] * PI_2)
          break
        case 'rotateY':
          transform.rotateY(values[0] * PI_2)
          break
        case 'rotateZ':
          transform.rotateZ(values[0] * PI_2)
          break
        case 'rotate3d':
          transform.rotate3d(
            values[0] * PI_2,
            (values[1] ?? values[0]) * PI_2,
            (values[2] ?? values[1] ?? values[0]) * PI_2,
            (values[3] ?? values[2] ?? values[1] ?? values[0]) * PI_2,
          )
          break
        case 'skew':
          transform.skew(values[0], values[0] ?? values[1])
          break
        case 'skewX':
          transform.skewX(values[0])
          break
        case 'skewY':
          transform.skewY(values[0])
          break
        case 'matrix':
          transform.set(values)
          break
      }
      transform3d.multiply(transform)
    })

  transform2d.update()
  transform3d.update()

  const t2d = transform2d.toArray()
  const t3d = transform3d.toArray()
  const t3dT2d = [
    (t3d[0] * t2d[0]) + (t3d[3] * t2d[1]),
    (t3d[1] * t2d[0]) + (t3d[4] * t2d[1]),
    (t3d[2] * t2d[0]) + (t3d[5] * t2d[1]) + t2d[2],
    (t3d[0] * t2d[3]) + (t3d[3] * t2d[4]),
    (t3d[1] * t2d[3]) + (t3d[4] * t2d[4]),
    (t3d[2] * t2d[3]) + (t3d[5] * t2d[4]) + t2d[5],
    0,
    0,
    1,
  ]
  const [originX, originY] = this.getComputedTransformOrigin()
  const offsetX = originX * this.width
  const offsetY = originY * this.height
  t3dT2d[2] += (t3dT2d[0] * -offsetX) + (t3dT2d[1] * -offsetY) + offsetX
  t3dT2d[5] += (t3dT2d[3] * -offsetX) + (t3dT2d[4] * -offsetY) + offsetY
  return new Transform2D().set(t3dT2d)
}

function getComputedTransformOrigin(this: Style2D): number[] {
  const [originX, originY = originX] = this.transformOrigin.split(' ')
  return [originX, originY].map((val) => {
    val = val.trim()
    switch (val) {
      case 'left':
      case 'top':
        return 0
      case 'center':
        return 0.5
      case 'right':
      case 'bottom':
        return 1
      default:
        return Number(val)
    }
  })
}
