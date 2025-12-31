import type { NormalizedFill } from 'modern-idoc'
import type { RectangleLike } from '../../../core'
import type { CanvasBatchable } from '../../main'
import { Transform2D } from '../../../core'

export function getFillDrawOptions(
  fill: NormalizedFill,
  rect: RectangleLike,
): Partial<Omit<CanvasBatchable, 'type'>> {
  const { x, y, width, height } = rect

  let clipOutsideUv = false
  const uvTransform = new Transform2D()
    .translate(-x, -y)
    .scale(1 / width, 1 / height)

  if (fill.cropRect) {
    const {
      left = 0,
      top = 0,
      right = 0,
      bottom = 0,
    } = fill.cropRect

    uvTransform
      .translate(-left, -top)
      .scale(
        1 / Math.abs(1 + (left + right)),
        1 / Math.abs(1 + (top + bottom)),
      )

    clipOutsideUv = true
  }
  else if (fill.tile) {
    const {
      translateX = 0,
      translateY = 0,
      scaleX = 1,
      scaleY = 1,
      // flip, TODO
      // alignment, TODO
    } = fill.tile

    uvTransform
      .translate(-translateX, -translateY)
      .scale(1 / scaleX, 1 / scaleY)
  }
  else if (fill.stretchRect) {
    const {
      left = 0,
      top = 0,
      right = 0,
      bottom = 0,
    } = fill.stretchRect

    uvTransform
      .translate(-left, -top)
      .scale(
        1 / Math.abs(1 + (-left - right)),
        1 / Math.abs(1 + (-top - bottom)),
      )

    clipOutsideUv = true
  }

  const { a, c, tx, b, d, ty } = uvTransform.toObject()

  let _x, _y
  return {
    clipOutsideUv,
    transformUv: (uvs, i) => {
      _x = uvs[i]
      _y = uvs[i + 1]
      uvs[i] = (a * _x) + (c * _y) + tx
      uvs[i + 1] = (b * _x) + (d * _y) + ty
    },
  }
}
