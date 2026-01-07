import type { Node as YogaNode } from 'yoga-layout/load'
import type { Node } from '../../main'
import { Element2D } from './Element2D'

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

export class Flexbox {
  static _yoga?: any
  static async load(): Promise<void> {
    const { loadYoga } = await import('yoga-layout/load')
    this._yoga = await loadYoga()
  }

  readonly node: YogaNode | undefined = Flexbox._yoga?.Node.create()

  constructor(
    protected _parent: Element2D,
  ) {
    this._addChild = this._addChild.bind(this)
    this._removeChild = this._removeChild.bind(this)

    this._parent.on('addChild', this._addChild)
    this._parent.on('removeChild', this._removeChild)
  }

  protected _addChild(child: Node, newIndex: number): void {
    if (
      child instanceof Element2D
      && child.flexbox.node
      && this.node
    ) {
      this.node.insertChild(child.flexbox.node, newIndex)

      const properties = child.style.getProperties()
      for (const key in properties) {
        child.flexbox.updateStyleProperty(key, properties[key])
      }
    }
  }

  protected _removeChild(child: Node, _oldIndex: number): void {
    if (
      child instanceof Element2D
      && child.flexbox.node
      && this.node
    ) {
      this.node.removeChild(child.flexbox.node)
    }
  }

  updateStyleProperty(key: string, value: any): void {
    const node = this.node

    if (!node) {
      return
    }

    switch (key) {
      case 'alignContent':
        node.setAlignContent(
          value
            ? (alignMap[value as keyof typeof alignMap] ?? alignMap['flex-start'])
            : alignMap['flex-start'],
        )
        break
      case 'alignItems':
        node.setAlignItems(
          value
            ? (alignMap[value as keyof typeof alignMap] ?? alignMap['flex-start'])
            : alignMap['flex-start'],
        )
        break
      case 'alignSelf':
        node.setAlignSelf(
          value
            ? (alignMap[value as keyof typeof alignMap] ?? alignMap['flex-start'])
            : alignMap['flex-start'],
        )
        break
      case 'aspectRatio':
        // node.setIsReferenceBaseline(this._parent.style.isReferenceBaseline)
        node.setAspectRatio(value)
        break
      case 'borderTop':
        node.setBorder(edgeMap.top, this._parent.style.borderWidth)
        break
      case 'borderBottom':
        node.setBorder(edgeMap.bottom, this._parent.style.borderWidth)
        break
      case 'borderLeft':
        node.setBorder(edgeMap.left, this._parent.style.borderWidth)
        break
      case 'borderRight':
        node.setBorder(edgeMap.right, this._parent.style.borderWidth)
        break
      case 'border':
        node.setBorder(edgeMap.all, this._parent.style.borderWidth)
        break
      case 'direction':
        node.setDirection(
          value
            ? (directionMap[value as keyof typeof directionMap] ?? directionMap.inherit)
            : directionMap.inherit,
        )
        break
      case 'display':
        node.setDisplay(
          value
            ? (displayMap[value as keyof typeof displayMap] ?? displayMap.flex)
            : displayMap.flex,
        )
        break
      case 'flex':
        node.setFlex(value)
        break
      case 'flexBasis':
        node.setFlexBasis(value)
        break
      case 'flexDirection':
        node.setFlexDirection(
          value
            ? (flexDirectionMap[value as keyof typeof flexDirectionMap] ?? flexDirectionMap.row)
            : flexDirectionMap.row,
        )
        break
      case 'flexGrow':
        node.setFlexGrow(value)
        break
      case 'flexShrink':
        node.setFlexShrink(value)
        break
      case 'flexWrap':
        node.setFlexWrap(
          value
            ? (flexWrapMap[value as keyof typeof flexWrapMap] ?? flexWrapMap.wrap)
            : flexWrapMap.wrap,
        )
        break
      case 'height':
        node.setHeight(value)
        break
      case 'justifyContent':
        node.setJustifyContent(
          value
            ? (justifyMap[value as keyof typeof justifyMap] ?? justifyMap['flex-start'])
            : justifyMap['flex-start'],
        )
        break
      case 'gap':
        if (value !== undefined) {
          node.setGap(gutterMap.all, value)
        }
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
        node.setMinHeight(value)
        break
      case 'minWidth':
        node.setMinWidth(value)
        break
      case 'overflow':
        node.setOverflow(
          value
            ? (overflowMap[value as keyof typeof overflowMap] ?? overflowMap.visible)
            : overflowMap.visible,
        )
        break
      case 'paddingTop':
        node.setPadding(edgeMap.top, value)
        break
      case 'paddingBottom':
        node.setPadding(edgeMap.bottom, value)
        break
      case 'paddingLeft':
        node.setPadding(edgeMap.left, value)
        break
      case 'paddingRight':
        node.setPadding(edgeMap.right, value)
        break
      case 'padding':
        node.setPadding(edgeMap.all, value)
        break
      case 'top':
        node.setPosition(edgeMap.top, value)
        break
      case 'bottom':
        node.setPosition(edgeMap.bottom, value)
        break
      case 'left':
        node.setPosition(edgeMap.left, value)
        break
      case 'right':
        node.setPosition(edgeMap.right, value)
        break
      case 'position':
        node.setPositionType(
          value
            ? (positionTypeMap[value as keyof typeof positionTypeMap] ?? positionTypeMap.relative)
            : positionTypeMap.relative,
        )
        break
      case 'boxSizing':
        node.setBoxSizing(
          value
            ? (boxSizingMap[value as keyof typeof boxSizingMap] ?? boxSizingMap['content-box'])
            : boxSizingMap['content-box'],
        )
        break
      case 'width':
        node.setWidth(value)
        break
    }

    this.update()
  }

  update(): void {
    const el = this._parent
    const node = this.node

    el.getParent<Element2D>()?.flexbox?.update()

    if (el.globalDisplay === 'flex' && node) {
      if (node.isDirty()) {
        node.calculateLayout(undefined, undefined, directionMap.ltr)
      }

      if (node.hasNewLayout()) {
        const { left, top, width, height } = node.getComputedLayout()

        if (
          (!Number.isNaN(left) && left !== el.position.x)
          || (!Number.isNaN(top) && top !== el.position.y)
        ) {
          el.position.set(left, top)
        }

        if (
          (!Number.isNaN(width) && width !== el.size.x)
          || (!Number.isNaN(height) && height !== el.size.y)
        ) {
          el.size.set(width, height)
        }

        node.markLayoutSeen()
      }
    }
  }
}
