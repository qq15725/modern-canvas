import type { IDOCTextStyleDeclaration } from 'modern-idoc'
import type { Style2D } from '../Style2D'
import { getDefaultTextStyle } from 'modern-idoc'
import { defineProperty } from '../../../core'
import { Style2DModule } from '../Style2DModule'

export interface Style2DTextProperties extends IDOCTextStyleDeclaration {
  direction: 'inherit' | 'ltr' | 'rtl'
}

export interface Style2DTextExtend extends Style2DTextProperties {
  //
}

export class Style2DTextModule extends Style2DModule {
  install(Style2D: new () => Style2D): void {
    const style = getDefaultTextStyle()
    for (const key in style) {
      defineProperty(Style2D, key, { default: (style as any)[key] })
    }
    defineProperty(Style2D, 'direction', { default: 'inherit' })
  }
}
