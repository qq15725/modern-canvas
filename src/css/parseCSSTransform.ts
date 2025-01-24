import { parseCssFunctions, PI_2, Transform2D } from '../core'

const _temp = new Transform2D()
export function parseCSSTransform(
  transform: string,
  width: number,
  height: number,
): Transform2D {
  const t2d = new Transform2D(false)
  transform = (!transform || transform === 'none') ? '' : transform
  parseCssFunctions(transform, { width, height })
    .forEach(({ name, args }) => {
      const values = args.map(arg => arg.normalizedIntValue)
      _temp.identity()
      switch (name) {
        case 'translate':
          _temp.translate((values[0]) * width, (values[1] ?? values[0]) * height)
          break
        case 'translateX':
          _temp.translateX(values[0] * width)
          break
        case 'translateY':
          _temp.translateY(values[0] * height)
          break
        case 'translateZ':
          _temp.translateZ(values[0])
          break
        case 'translate3d':
          _temp.translate3d(
            values[0] * width,
            (values[1] ?? values[0]) * height,
            values[2] ?? values[1] ?? values[0],
          )
          break
        case 'scale':
          _temp.scale(values[0], values[1] ?? values[0])
          break
        case 'scaleX':
          _temp.scaleX(values[0])
          break
        case 'scaleY':
          _temp.scaleY(values[0])
          break
        case 'scale3d':
          _temp.scale3d(values[0], values[1] ?? values[0], values[2] ?? values[1] ?? values[0])
          break
        case 'rotate':
          _temp.rotate(values[0] * PI_2)
          break
        case 'rotateX':
          _temp.rotateX(values[0] * PI_2)
          break
        case 'rotateY':
          _temp.rotateY(values[0] * PI_2)
          break
        case 'rotateZ':
          _temp.rotateZ(values[0] * PI_2)
          break
        case 'rotate3d':
          _temp.rotate3d(
            values[0] * PI_2,
            (values[1] ?? values[0]) * PI_2,
            (values[2] ?? values[1] ?? values[0]) * PI_2,
            (values[3] ?? values[2] ?? values[1] ?? values[0]) * PI_2,
          )
          break
        case 'skew':
          _temp.skew(values[0], values[0] ?? values[1])
          break
        case 'skewX':
          _temp.skewX(values[0])
          break
        case 'skewY':
          _temp.skewY(values[0])
          break
        case 'matrix':
          _temp.set(values)
          break
      }
      t2d.multiply(_temp)
    })
  t2d.update()
  return t2d
}
