import type { Node as YogaNode } from 'yoga-layout/load'
import type { Element2D, Element2DStyle } from './element'

export const edgeMap = {
  left: 0, // Edge.Left
  top: 1, // Edge.Top
  right: 2, // Edge.Right
  bottom: 3, // Edge.Bottom
  start: 4, // Edge.Start
  end: 5, // Edge.End
  horizontal: 6, // Edge.Horizontal
  vertical: 7, // Edge.Vertical
  all: 8, // Edge.All
}

export const gutterMap = {
  column: 0, // Gutter.Column
  row: 1, // Gutter.Row
  all: 2, // Gutter.All
}

export const alignMap = {
  'auto': 0, // Align.Auto
  'flex-start': 1, // Align.FlexStart
  'center': 2, // Align.Center
  'flex-end': 3, // Align.FlexEnd
  'stretch': 4, // Align.Stretch
  'baseline': 5, // Align.Baseline
  'space-between': 6, // Align.SpaceBetween
  'space-around': 7, // Align.SpaceAround
  'space-evenly': 8, // Align.SpaceEvenly
}

export const displayMap = {
  flex: 0, // Display.Flex
  none: 1, // Display.None
  contents: 2, // Display.Contents
}

export const directionMap = {
  inherit: 0, // Direction.Inherit
  ltr: 1, // Direction.LTR
  rtl: 2, // Direction.RTL
}

export const flexDirectionMap = {
  'column': 0, // FlexDirection.Column
  'column-reverse': 1, // FlexDirection.ColumnReverse
  'row': 2, // FlexDirection.Row
  'row-reverse': 3, // FlexDirection.RowReverse
}

export const flexWrapMap = {
  'no-wrap': 0, // Wrap.NoWrap
  'wrap': 1, // Wrap.Wrap
  'Wrap-reverse': 2, // Wrap.WrapReverse
}

export const justifyMap = {
  'flex-start': 0, // Justify.FlexStart
  'center': 1, // Justify.Center
  'flex-end': 2, // Justify.FlexEnd
  'space-between': 3, // Justify.SpaceBetween
  'space-around': 4, // Justify.SpaceAround
  'space-evenly': 5, // Justify.SpaceEvenly
}

export const overflowMap = {
  visible: 0, // Overflow.Visible
  hidden: 1, // Overflow.Hidden
  scroll: 2, // Overflow.Scroll
}

export const positionTypeMap = {
  static: 0, // PositionType.Static
  relative: 1, // PositionType.Relative
  absolute: 2, // PositionType.Absolute
}

export const boxSizingMap = {
  'border-box': 0, // BoxSizing.BorderBox
  'content-box': 1, // BoxSizing.ContentBox
}

export interface ComputedLayout {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
}

export class FlexLayout {
  static _yoga?: any
  static async load(): Promise<void> {
    const { loadYoga } = await import('yoga-layout/load')
    this._yoga = await loadYoga()
  }

  _node: YogaNode | undefined = FlexLayout._yoga?.Node.create()

  protected get _style(): Element2DStyle {
    return this._element.style
  }

  constructor(
    protected _element: Element2D,
  ) {
    //
  }

  calculateLayout(width?: number | 'auto', height?: number | 'auto', direction?: typeof displayMap[keyof typeof displayMap]): void {
    this._node?.calculateLayout(width, height, direction)
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  updateStyleProperty(key: string, value: any, oldValue: any): void {
    const node = this._node

    if (!node) {
      return
    }

    switch (key) {
      case 'alignContent':
        node.setAlignContent(
          value
            ? alignMap[value as keyof typeof alignMap]
            : alignMap['flex-start'],
        )
        break
      case 'alignItems':
        node.setAlignItems(
          value
            ? alignMap[value as keyof typeof alignMap]
            : alignMap['flex-start'],
        )
        break
      case 'alignSelf':
        node.setAlignSelf(
          value
            ? alignMap[value as keyof typeof alignMap]
            : alignMap['flex-start'],
        )
        break
      case 'aspectRatio':
        // node.setIsReferenceBaseline(this._style.isReferenceBaseline)
        node.setAspectRatio(value)
        break
      case 'borderTop':
        node.setBorder(edgeMap.top, this._style.borderWidth)
        break
      case 'borderBottom':
        node.setBorder(edgeMap.bottom, this._style.borderWidth)
        break
      case 'borderLeft':
        node.setBorder(edgeMap.left, this._style.borderWidth)
        break
      case 'borderRight':
        node.setBorder(edgeMap.right, this._style.borderWidth)
        break
      case 'border':
        node.setBorder(edgeMap.all, this._style.borderWidth)
        break
      case 'direction':
        node.setDirection(
          value
            ? directionMap[value as keyof typeof directionMap]
            : directionMap.inherit,
        )
        break
      case 'display':
        node.setDisplay(
          value
            ? displayMap[value as keyof typeof displayMap]
            : displayMap.flex,
        )
        break
      case 'flex':
        node.setFlex(this._style.flex)
        break
      case 'flexBasis':
        node.setFlexBasis(this._style.flexBasis)
        break
      case 'flexDirection':
        node.setFlexDirection(
          value
            ? flexDirectionMap[value as keyof typeof flexDirectionMap]
            : flexDirectionMap.row,
        )
        break
      case 'flexGrow':
        node.setFlexGrow(this._style.flexGrow)
        break
      case 'flexShrink':
        node.setFlexShrink(this._style.flexShrink)
        break
      case 'flexWrap':
        node.setFlexWrap(
          value
            ? flexWrapMap[value as keyof typeof flexWrapMap]
            : flexWrapMap.wrap,
        )
        break
      case 'height':
        node.setHeight(this._style.height)
        break
      case 'justifyContent':
        node.setJustifyContent(
          value
            ? justifyMap[value as keyof typeof justifyMap]
            : justifyMap['flex-start'],
        )
        break
      case 'gap':
        value !== undefined && node.setGap(gutterMap.all, value)
        break
      case 'marginTop':
        node.setMargin(edgeMap.top, value)
        break
      case 'marginBottom':
        node.setMargin(edgeMap.bottom, value)
        break
      case 'marginLeft':
        node.setMargin(edgeMap.left, value)
        break
      case 'marginRight':
        node.setMargin(edgeMap.right, value)
        break
      case 'margin':
        node.setMargin(edgeMap.all, value)
        break
      case 'maxHeight':
        node.setMaxHeight(value)
        break
      case 'maxWidth':
        node.setMaxWidth(value)
        break
      //   setDirtiedFunc(dirtiedFunc: DirtiedFunction | null): void;
      //   setMeasureFunc(measureFunc: MeasureFunction | null): void;
      case 'minHeight':
        node.setMinHeight(this._style.minHeight)
        break
      case 'minWidth':
        node.setMinWidth(this._style.minWidth)
        break
      case 'overflow':
        node.setOverflow(
          value
            ? overflowMap[value as keyof typeof overflowMap]
            : overflowMap.visible,
        )
        break
      case 'paddingTop':
        node.setPadding(edgeMap.top, this._style.paddingTop)
        break
      case 'paddingBottom':
        node.setPadding(edgeMap.bottom, this._style.paddingBottom)
        break
      case 'paddingLeft':
        node.setPadding(edgeMap.left, this._style.paddingLeft)
        break
      case 'paddingRight':
        node.setPadding(edgeMap.right, this._style.paddingRight)
        break
      case 'padding':
        node.setPadding(edgeMap.all, this._style.padding)
        break
      case 'top':
        node.setPosition(edgeMap.top, this._style.top)
        break
      case 'bottom':
        node.setPosition(edgeMap.bottom, this._style.bottom)
        break
      case 'left':
        node.setPosition(edgeMap.left, this._style.left)
        break
      case 'right':
        node.setPosition(edgeMap.right, this._style.right)
        break
      case 'position':
        node.setPositionType(
          value
            ? positionTypeMap[value as keyof typeof positionTypeMap]
            : positionTypeMap.static,
        )
        break
      case 'boxSizing':
        node.setBoxSizing(
          value
            ? boxSizingMap[value as keyof typeof boxSizingMap]
            : boxSizingMap['content-box'],
        )
        break
      case 'width':
        node.setWidth(this._style.width)
        break
    }
  }
}
