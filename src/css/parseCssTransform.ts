import { parseCssFunctions, PI_2, Transform2D } from '../core'

export function parseCssTransform(
  transform: string,
  width: number,
  height: number,
  output = new Transform2D(),
): Transform2D {
  transform = (!transform || transform === 'none') ? '' : transform
  parseCssFunctions(transform, { width, height })
    .reverse()
    .forEach(({ name, args }) => {
      const values = args.map(arg => arg.normalizedIntValue)
      switch (name) {
        case 'translate':
          output.translate((values[0]) * width, (values[1] ?? values[0]) * height)
          break
        case 'translateX':
          output.translateX(values[0] * width)
          break
        case 'translateY':
          output.translateY(values[0] * height)
          break
        case 'translateZ':
          output.translateZ(values[0])
          break
        case 'translate3d':
          output.translate3d(
            values[0] * width,
            (values[1] ?? values[0]) * height,
            values[2] ?? values[1] ?? values[0],
          )
          break
        case 'scale':
          output.scale(values[0], values[1] ?? values[0])
          break
        case 'scaleX':
          output.scaleX(values[0])
          break
        case 'scaleY':
          output.scaleY(values[0])
          break
        case 'scale3d':
          output.scale3d(values[0], values[1] ?? values[0], values[2] ?? values[1] ?? values[0])
          break
        case 'rotate':
          output.rotate(values[0] * PI_2)
          break
        case 'rotateX':
          output.rotateX(values[0] * PI_2)
          break
        case 'rotateY':
          output.rotateY(values[0] * PI_2)
          break
        case 'rotateZ':
          output.rotateZ(values[0] * PI_2)
          break
        case 'rotate3d':
          output.rotate3d(
            values[0] * PI_2,
            (values[1] ?? values[0]) * PI_2,
            (values[2] ?? values[1] ?? values[0]) * PI_2,
            (values[3] ?? values[2] ?? values[1] ?? values[0]) * PI_2,
          )
          break
        case 'skew':
          output.skew(values[0], values[0] ?? values[1])
          break
        case 'skewX':
          output.skewX(values[0])
          break
        case 'skewY':
          output.skewY(values[0])
          break
        case 'matrix':
          output.set(values[0], values[1], values[2], values[3], values[4], values[5])
          break
      }
    })
  return output
}
