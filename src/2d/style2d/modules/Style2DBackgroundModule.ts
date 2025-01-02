import type { Style2D } from '../Style2D'
import { assets } from '../../../asset'
import { ColorTexture } from '../../../color'
import { defineProperty } from '../../../core'
import { Style2DModule } from '../Style2DModule'

export interface Style2DBackgroundProperties {
  backgroundColor?: string
  backgroundImage?: string
}

export interface Style2DBackgroundExtend extends Style2DBackgroundProperties {
  getComputedBackground: typeof getComputedBackground
}

export class Style2DBackgroundModule extends Style2DModule {
  install(Style2D: new () => Style2D): void {
    defineProperty(Style2D, 'backgroundColor')
    defineProperty(Style2D, 'backgroundImage')
    Style2D.prototype.getComputedBackground = getComputedBackground
  }
}

async function getComputedBackground(this: Style2D): Promise<ColorTexture | undefined> {
  if (this.backgroundImage) {
    return await assets.texture.load(this.backgroundImage)
  }
  if (this.backgroundColor) {
    return new ColorTexture(this.backgroundColor)
  }
}
