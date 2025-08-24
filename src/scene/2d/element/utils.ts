import type { NormalizedFill } from 'modern-idoc'
import type { Vector2 } from '../../../core'
import { Transform2D } from '../../../core'

export function getDrawOptions(
  fill: NormalizedFill,
  size: Vector2,
): { disableWrapMode: boolean, uvTransform: Transform2D } {
  let disableWrapMode = false

  const { width, height } = size

  const uvTransform = new Transform2D()
    .scale(1 / width, 1 / height)

  if (fill.cropRect) {
    const {
      left = 0,
      top = 0,
      right = 0,
      bottom = 0,
    } = fill.cropRect
    uvTransform
      .scale(
        Math.abs(1 - (left + right)),
        Math.abs(1 - (top + bottom)),
      )
      .translate(left, top)
    disableWrapMode = true
  }

  if (fill.tile) {
    const {
      translateX = 0,
      translateY = 0,
      scaleX = 1,
      scaleY = 1,
      // flip, TODO
      // alignment, TODO
    } = fill.tile
    uvTransform
      .translate(-translateX / width, -translateY / height)
      .scale(1 / scaleX, 1 / scaleY)
    disableWrapMode = true
  }
  else if (fill.stretchRect) {
    const { left = 0, top = 0, right = 0, bottom = 0 } = fill.stretchRect
    uvTransform
      .scale(
        Math.abs(1 - (-left + -right)),
        Math.abs(1 - (-top + -bottom)),
      )
      .translate(-left, -top)
    disableWrapMode = true
  }

  return { disableWrapMode, uvTransform }
}
