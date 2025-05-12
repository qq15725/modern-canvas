import { LinearGradient } from '../../../core'
import { Texture2D } from './Texture2D'

export class GradientTexture extends Texture2D {
  // |(radial-gradient)
  static regExp = /(linear-gradient)/

  static test(value: string): boolean {
    return this.regExp.test(value)
  }

  constructor(value: string, width: number, height: number) {
    super(
      LinearGradient.from(value)
        .parse(width, height),
    )
  }
}
