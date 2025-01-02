import type {
  FontKerning,
  FontStyle,
  FontWeight,
  TextAlign,
  TextDecoration,
  TextTransform,
  TextWrap,
  VerticalAlign,
  WritingMode,
} from 'modern-idoc'
import type { Style2D } from '../Style2D'
import { defineProperty } from '../../../core'
import { Style2DModule } from './Style2DModule'

export interface Style2DTextProperties {
  color: string
  fontSize: number
  fontWeight: FontWeight
  fontFamily: string
  fontStyle: FontStyle
  fontKerning: FontKerning
  textWrap: TextWrap
  textAlign: TextAlign
  verticalAlign: VerticalAlign
  textTransform: TextTransform
  textDecoration: TextDecoration | null
  textStrokeWidth: number
  textStrokeColor: string
  direction: 'inherit' | 'ltr' | 'rtl'
  lineHeight: number
  letterSpacing: number
  writingMode: WritingMode
}

declare module '../Style2D' {
  interface Style2DOptions extends Partial<Style2DTextProperties> {
    //
  }

  interface Style2D extends Style2DTextProperties {
    //
  }
}

export class Style2DTextModule extends Style2DModule {
  install(Style2D: new () => Style2D): void {
    defineProperty(Style2D, 'color', { default: '#000000' })
    defineProperty(Style2D, 'fontSize', { default: 14 })
    defineProperty(Style2D, 'fontWeight', { default: 'normal' })
    defineProperty(Style2D, 'fontFamily', { default: 'sans-serif' })
    defineProperty(Style2D, 'fontStyle', { default: 'normal' })
    defineProperty(Style2D, 'fontKerning', { default: 'normal' })
    defineProperty(Style2D, 'textWrap', { default: 'wrap' })
    defineProperty(Style2D, 'textAlign', { default: 'start' })
    defineProperty(Style2D, 'verticalAlign', { default: 'middle' })
    defineProperty(Style2D, 'textTransform', { default: 'none' })
    defineProperty(Style2D, 'textDecoration', { default: null })
    defineProperty(Style2D, 'textStrokeWidth', { default: 0 })
    defineProperty(Style2D, 'textStrokeColor', { default: '#000000' })
    defineProperty(Style2D, 'direction', { default: 'inherit' })
    defineProperty(Style2D, 'lineHeight', { default: 1 })
    defineProperty(Style2D, 'letterSpacing', { default: 0 })
    defineProperty(Style2D, 'writingMode', { default: 'horizontal-tb' })
  }
}
