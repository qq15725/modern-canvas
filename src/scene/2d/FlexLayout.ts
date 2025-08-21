import type { PropertyDeclaration } from 'modern-idoc'
import type { Node as YogaNode } from 'yoga-layout/load'
import type { FlexElement2DStyle } from './element'
import type { FlexElement2D } from './FlexElement2D'

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

  _node: YogaNode = FlexLayout._yoga!.Node.create()

  protected get _style(): FlexElement2DStyle {
    return this._element.style
  }

  get offsetLeft(): number {
    return this._node.getComputedLeft()
  }

  get offsetTop(): number {
    return this._node.getComputedTop()
  }

  get offsetWidth(): number {
    return this._node.getComputedWidth()
  }

  get offsetHeight(): number {
    return this._node.getComputedHeight()
  }

  constructor(
    protected _element: FlexElement2D,
  ) {
    //
  }

  calculateLayout(width?: number | 'auto', height?: number | 'auto', direction?: typeof displayMap[keyof typeof displayMap]): void {
    return this._node.calculateLayout(width, height, direction)
  }

  getComputedLayout(): ComputedLayout {
    return this._node.getComputedLayout()
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  updateStyleProperty(key: string, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    switch (key) {
      case 'alignContent':
        this._node.setAlignContent(
          value
            ? alignMap[value as keyof typeof alignMap]
            : alignMap['flex-start'],
        )
        break
      case 'alignItems':
        this._node.setAlignItems(
          value
            ? alignMap[value as keyof typeof alignMap]
            : alignMap['flex-start'],
        )
        break
      case 'alignSelf':
        this._node.setAlignSelf(
          value
            ? alignMap[value as keyof typeof alignMap]
            : alignMap['flex-start'],
        )
        break
      case 'aspectRatio':
        // this._node.setIsReferenceBaseline(this._style.isReferenceBaseline)
        this._node.setAspectRatio(value)
        break
      case 'borderTop':
        this._node.setBorder(edgeMap.top, this._style.borderWidth)
        break
      case 'borderBottom':
        this._node.setBorder(edgeMap.bottom, this._style.borderWidth)
        break
      case 'borderLeft':
        this._node.setBorder(edgeMap.left, this._style.borderWidth)
        break
      case 'borderRight':
        this._node.setBorder(edgeMap.right, this._style.borderWidth)
        break
      case 'border':
        this._node.setBorder(edgeMap.all, this._style.borderWidth)
        break
      case 'direction':
        this._node.setDirection(
          value
            ? directionMap[value as keyof typeof directionMap]
            : directionMap.inherit,
        )
        break
      case 'display':
        this._node.setDisplay(
          value
            ? displayMap[value as keyof typeof displayMap]
            : displayMap.flex,
        )
        break
      case 'flex':
        this._node.setFlex(this._style.flex)
        break
      case 'flexBasis':
        this._node.setFlexBasis(this._style.flexBasis)
        break
      case 'flexDirection':
        this._node.setFlexDirection(
          value
            ? flexDirectionMap[value as keyof typeof flexDirectionMap]
            : flexDirectionMap.row,
        )
        break
      case 'flexGrow':
        this._node.setFlexGrow(this._style.flexGrow)
        break
      case 'flexShrink':
        this._node.setFlexShrink(this._style.flexShrink)
        break
      case 'flexWrap':
        this._node.setFlexWrap(
          value
            ? flexWrapMap[value as keyof typeof flexWrapMap]
            : flexWrapMap.wrap,
        )
        break
      case 'height':
        this._node.setHeight(this._style.height)
        break
      case 'justifyContent':
        this._node.setJustifyContent(
          value
            ? justifyMap[value as keyof typeof justifyMap]
            : justifyMap['flex-start'],
        )
        break
      case 'gap':
        value !== undefined && this._node.setGap(gutterMap.all, value)
        break
      case 'marginTop':
        this._node.setMargin(edgeMap.top, value)
        break
      case 'marginBottom':
        this._node.setMargin(edgeMap.bottom, value)
        break
      case 'marginLeft':
        this._node.setMargin(edgeMap.left, value)
        break
      case 'marginRight':
        this._node.setMargin(edgeMap.right, value)
        break
      case 'margin':
        this._node.setMargin(edgeMap.all, value)
        break
      case 'maxHeight':
        this._node.setMaxHeight(value)
        break
      case 'maxWidth':
        this._node.setMaxWidth(value)
        break
      //   setDirtiedFunc(dirtiedFunc: DirtiedFunction | null): void;
      //   setMeasureFunc(measureFunc: MeasureFunction | null): void;
      case 'minHeight':
        this._node.setMinHeight(this._style.minHeight)
        break
      case 'minWidth':
        this._node.setMinWidth(this._style.minWidth)
        break
      case 'overflow':
        this._node.setOverflow(
          value
            ? overflowMap[value as keyof typeof overflowMap]
            : overflowMap.visible,
        )
        break
      case 'paddingTop':
        this._node.setPadding(edgeMap.top, this._style.paddingTop)
        break
      case 'paddingBottom':
        this._node.setPadding(edgeMap.bottom, this._style.paddingBottom)
        break
      case 'paddingLeft':
        this._node.setPadding(edgeMap.left, this._style.paddingLeft)
        break
      case 'paddingRight':
        this._node.setPadding(edgeMap.right, this._style.paddingRight)
        break
      case 'padding':
        this._node.setPadding(edgeMap.all, this._style.padding)
        break
      case 'top':
        this._node.setPosition(edgeMap.top, this._style.top)
        break
      case 'bottom':
        this._node.setPosition(edgeMap.bottom, this._style.bottom)
        break
      case 'left':
        this._node.setPosition(edgeMap.left, this._style.left)
        break
      case 'right':
        this._node.setPosition(edgeMap.right, this._style.right)
        break
      case 'position':
        this._node.setPositionType(
          value
            ? positionTypeMap[value as keyof typeof positionTypeMap]
            : positionTypeMap.static,
        )
        break
      case 'boxSizing':
        this._node.setBoxSizing(
          value
            ? boxSizingMap[value as keyof typeof boxSizingMap]
            : boxSizingMap['content-box'],
        )
        break
      case 'width':
        this._node.setWidth(this._style.width)
        break
    }
  }
}
