import type {
  Node as YogaNode,
} from 'yoga-layout/load'
import type { PropertyDeclaration } from '../../core'
import type { FlexElement2D } from './FlexElement2D'
import type { FlexElement2DStyle } from './FlexElement2DStyle'
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

const alignMap: Record<string, any> = {
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

const displayMap: Record<string, any> = {
  none: Display.None,
  flex: Display.Flex,
  contents: Display.Contents,
}

const directionMap: Record<string, any> = {
  inherit: Direction.Inherit,
  ltr: Direction.LTR,
  rtl: Direction.RTL,
}

const flexDirectionMap: Record<string, any> = {
  'column': FlexDirection.Column,
  'column-reverse': FlexDirection.ColumnReverse,
  'row': FlexDirection.Row,
  'row-reverse': FlexDirection.RowReverse,
}

const flexWrapMap: Record<string, any> = {
  'no-wrap': Wrap.NoWrap,
  'wrap': Wrap.Wrap,
  'Wrap-reverse': Wrap.WrapReverse,
}

const justifyMap: Record<string, any> = {
  'flex-start': Justify.FlexStart,
  'center': Justify.Center,
  'flex-end': Justify.FlexEnd,
  'space-between': Justify.SpaceBetween,
  'space-around': Justify.SpaceAround,
  'space-evenly': Justify.SpaceEvenly,
}

const overflowMap: Record<string, any> = {
  visible: Overflow.Visible,
  hidden: Overflow.Hidden,
  scroll: Overflow.Scroll,
}

const positionTypeMap: Record<string, any> = {
  static: PositionType.Static,
  relative: PositionType.Relative,
  absolute: PositionType.Absolute,
}

const boxSizingMap: Record<string, any> = {
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
  updateStyleProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    switch (key) {
      case 'alignContent':
        this._node.setAlignContent(alignMap[this._style.alignContent])
        break
      case 'alignItems':
        this._node.setAlignItems(alignMap[this._style.alignItems])
        break
      case 'alignSelf':
        this._node.setAlignSelf(alignMap[this._style.alignSelf])
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
        this._node.setDirection(directionMap[this._style.direction])
        break
      case 'display':
        this._node.setDisplay(displayMap[this._style.display])
        break
      case 'flex':
        this._node.setFlex(this._style.flex)
        break
      case 'flexBasis':
        this._node.setFlexBasis(this._style.flexBasis)
        break
      case 'flexDirection':
        this._node.setFlexDirection(flexDirectionMap[this._style.flexDirection])
        break
      case 'flexGrow':
        this._node.setFlexGrow(this._style.flexGrow)
        break
      case 'flexShrink':
        this._node.setFlexShrink(this._style.flexShrink)
        break
      case 'flexWrap':
        this._node.setFlexWrap(flexWrapMap[this._style.flexWrap])
        break
      case 'height':
        this._node.setHeight(this._style.height)
        break
      case 'justifyContent':
        this._node.setJustifyContent(justifyMap[this._style.justifyContent])
        break
      case 'gap':
        this._node.setGap(Gutter.All, this._style.gap)
        break
      case 'marginTop':
        this._node.setMargin(Edge.Top, this._style.marginTop)
        break
      case 'marginBottom':
        this._node.setMargin(Edge.Top, this._style.marginBottom)
        break
      case 'marginLeft':
        this._node.setMargin(Edge.Left, this._style.marginLeft)
        break
      case 'marginRight':
        this._node.setMargin(Edge.Top, this._style.marginRight)
        break
      case 'margin':
        this._node.setMargin(Edge.All, this._style.margin)
        break
      case 'maxHeight':
        this._node.setMaxHeight(this._style.maxHeight)
        break
      case 'maxWidth':
        this._node.setMaxWidth(this._style.maxWidth)
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
        this._node.setOverflow(overflowMap[this._style.overflow])
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
        this._node.setPositionType(positionTypeMap[this._style.position])
        break
      case 'boxSizing':
        this._node.setBoxSizing(boxSizingMap[this._style.boxSizing])
        break
      case 'width':
        this._node.setWidth(this._style.width)
        break
    }
  }
}
