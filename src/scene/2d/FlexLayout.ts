import type { PropertyDeclaration } from 'modern-idoc'
import type {
  Node as YogaNode,
} from 'yoga-layout/load'
import type { FlexElement2DStyle } from './element'
import type { FlexElement2D } from './FlexElement2D'
import {
  Align,
  BoxSizing,
  Direction,
  Display,
  Edge,
  FlexDirection,
  Gutter,
  Justify,
  loadYoga,
  Overflow,
  PositionType,
  Wrap,
} from 'yoga-layout/load'

const alignMap = {
  'auto': Align.Auto,
  'flex-start': Align.FlexStart,
  'center': Align.Center,
  'flex-end': Align.FlexEnd,
  'stretch': Align.Stretch,
  'baseline': Align.Baseline,
  'space-between': Align.SpaceBetween,
  'space-around': Align.SpaceAround,
  'space-evenly': Align.SpaceEvenly,
}

const displayMap = {
  none: Display.None,
  flex: Display.Flex,
  contents: Display.Contents,
}

const directionMap = {
  inherit: Direction.Inherit,
  ltr: Direction.LTR,
  rtl: Direction.RTL,
}

const flexDirectionMap = {
  'column': FlexDirection.Column,
  'column-reverse': FlexDirection.ColumnReverse,
  'row': FlexDirection.Row,
  'row-reverse': FlexDirection.RowReverse,
}

const flexWrapMap = {
  'no-wrap': Wrap.NoWrap,
  'wrap': Wrap.Wrap,
  'Wrap-reverse': Wrap.WrapReverse,
}

const justifyMap = {
  'flex-start': Justify.FlexStart,
  'center': Justify.Center,
  'flex-end': Justify.FlexEnd,
  'space-between': Justify.SpaceBetween,
  'space-around': Justify.SpaceAround,
  'space-evenly': Justify.SpaceEvenly,
}

const overflowMap = {
  visible: Overflow.Visible,
  hidden: Overflow.Hidden,
  scroll: Overflow.Scroll,
}

const positionTypeMap = {
  static: PositionType.Static,
  relative: PositionType.Relative,
  absolute: PositionType.Absolute,
}

const boxSizingMap = {
  'border-box': BoxSizing.BorderBox,
  'content-box': BoxSizing.ContentBox,
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

  calculateLayout(width?: number | 'auto', height?: number | 'auto', direction?: Direction): void {
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
        this._node.setBorder(Edge.Top, this._style.borderWidth)
        break
      case 'borderBottom':
        this._node.setBorder(Edge.Bottom, this._style.borderWidth)
        break
      case 'borderLeft':
        this._node.setBorder(Edge.Left, this._style.borderWidth)
        break
      case 'borderRight':
        this._node.setBorder(Edge.Right, this._style.borderWidth)
        break
      case 'border':
        this._node.setBorder(Edge.All, this._style.borderWidth)
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
        value !== undefined && this._node.setGap(Gutter.All, value)
        break
      case 'marginTop':
        this._node.setMargin(Edge.Top, value)
        break
      case 'marginBottom':
        this._node.setMargin(Edge.Top, value)
        break
      case 'marginLeft':
        this._node.setMargin(Edge.Left, value)
        break
      case 'marginRight':
        this._node.setMargin(Edge.Top, value)
        break
      case 'margin':
        this._node.setMargin(Edge.All, value)
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
        this._node.setPadding(Edge.Top, this._style.paddingTop)
        break
      case 'paddingBottom':
        this._node.setPadding(Edge.Bottom, this._style.paddingBottom)
        break
      case 'paddingLeft':
        this._node.setPadding(Edge.Left, this._style.paddingLeft)
        break
      case 'paddingRight':
        this._node.setPadding(Edge.Right, this._style.paddingRight)
        break
      case 'padding':
        this._node.setPadding(Edge.All, this._style.padding)
        break
      case 'top':
        this._node.setPosition(Edge.Top, this._style.top)
        break
      case 'bottom':
        this._node.setPosition(Edge.Bottom, this._style.bottom)
        break
      case 'left':
        this._node.setPosition(Edge.Left, this._style.left)
        break
      case 'right':
        this._node.setPosition(Edge.Right, this._style.right)
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
