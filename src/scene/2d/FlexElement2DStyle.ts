import type { BaseElement2DStyleProperties } from './BaseElement2DStyle'
import { defineProperty } from '../../core'
import { BaseElement2DStyle } from './BaseElement2DStyle'

export type Align = 'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline' | 'space-between' | 'space-around' | 'space-evenly'
export type FlexDirection = 'column' | 'column-reverse' | 'row' | 'row-reverse'
export type FlexWrap = 'nowrap' | 'wrap' | 'Wrap-reverse'
export type Justify = 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'
export type Position = 'static' | 'relative' | 'absolute'
export type BoxSizing = 'border-box' | 'content-box'

export interface LayoutStyleDeclaration {
  alignContent: Align
  alignItems: Align
  alignSelf: Align
  borderTop: string
  borderLeft: string
  borderRight: string
  borderBottom: string
  borderWidth: number
  border: string
  direction: 'inherit' | 'ltr' | 'rtl'
  display: 'none' | 'flex' | 'contents'
  flex: number
  flexBasis: number | 'auto' | `${number}%`
  flexDirection: FlexDirection
  flexGrow: number
  flexShrink: number
  flexWrap: FlexWrap
  height: number | 'auto' | `${number}%`
  justifyContent: Justify
  gap: number | `${number}%`
  marginTop: number | 'auto' | `${number}%`
  marginLeft: number | 'auto' | `${number}%`
  marginRight: number | 'auto' | `${number}%`
  marginBottom: number | 'auto' | `${number}%`
  margin: number | 'auto' | `${number}%`
  maxHeight: number | `${number}%`
  maxWidth: number | `${number}%`
  minHeight: number | `${number}%`
  minWidth: number | `${number}%`
  paddingTop: number | `${number}%`
  paddingLeft: number | `${number}%`
  paddingRight: number | `${number}%`
  paddingBottom: number | `${number}%`
  padding: number | `${number}%`
  top: number | `${number}%`
  bottom: number | `${number}%`
  left: number | `${number}%`
  right: number | `${number}%`
  position: Position
  boxSizing: BoxSizing
  width: number | 'auto' | `${number}%`
}

export interface FlexElement2DStyleProperties extends
  BaseElement2DStyleProperties,
  LayoutStyleDeclaration {
  //
}

export interface FlexElement2DStyle extends FlexElement2DStyleProperties {
  //
}

export class FlexElement2DStyle extends BaseElement2DStyle {
  constructor(properties?: Partial<FlexElement2DStyleProperties>) {
    super()
    this.setProperties(properties)
  }
}

const defaultStyles: LayoutStyleDeclaration = {
  alignContent: 'stretch',
  alignItems: 'stretch',
  alignSelf: 'auto',
  borderTop: 'none',
  borderLeft: 'none',
  borderRight: 'none',
  borderBottom: 'none',
  borderWidth: 0,
  border: 'none',
  direction: 'inherit',
  display: 'flex',
  flex: 0,
  flexBasis: 'auto',
  flexDirection: 'row',
  flexGrow: 0,
  flexShrink: 1,
  flexWrap: 'nowrap',
  height: 'auto',
  justifyContent: 'flex-start',
  gap: 0,
  marginTop: 0,
  marginLeft: 0,
  marginRight: 0,
  marginBottom: 0,
  margin: 0,
  maxHeight: 0,
  maxWidth: 0,
  minHeight: 0,
  minWidth: 0,
  paddingTop: 0,
  paddingLeft: 0,
  paddingRight: 0,
  paddingBottom: 0,
  padding: 0,
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  position: 'static',
  boxSizing: 'content-box',
  width: 'auto',
}

for (const key in defaultStyles) {
  defineProperty(FlexElement2DStyle, key, { default: (defaultStyles as any)[key] })
}
