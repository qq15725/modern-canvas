import type { Style2D } from '../Style2D'
import { assets } from '../../../asset'
import { ColorTexture } from '../../../color'
import { defineProperty } from '../../../core'
import { Style2DModule } from './Style2DModule'

export interface Style2DBackgroundProperties {
  backgroundColor?: string
  backgroundImage?: string
}

declare module '../Style2D' {
  interface Style2DOptions extends Partial<Style2DBackgroundProperties> {
    //
  }

  interface Style2D extends Style2DBackgroundProperties {
    getComputedBackground: typeof getComputedBackground
  }
}

export class Style2DBackgroundModule extends Style2DModule {
  install(Style2D: new () => Style2D): void {
    defineProperty(Style2D, 'backgroundColor')
    defineProperty(Style2D, 'backgroundImage')
    Style2D.prototype.getComputedBackground = getComputedBackground
  }
}

async function getComputedBackground(this: Style2D) {
  if (this.backgroundImage) {
    return await assets.texture.load(this.backgroundImage)
  }
  if (this.backgroundColor) {
    return new ColorTexture(this.backgroundColor)
  }
  return undefined
}
