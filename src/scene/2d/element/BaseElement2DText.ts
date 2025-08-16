import type { PropertyDeclaration, TextContent, Text as TextProperties } from 'modern-idoc'
import type { MeasureResult } from 'modern-text'
import type { BaseElement2D } from './BaseElement2D'
import { isNone, normalizeText, normalizeTextContent, property } from 'modern-idoc'
import { Text } from 'modern-text'
import { CoreObject } from '../../../core'

export class BaseElement2DText extends CoreObject {
  @property({ fallback: true }) declare enabled: boolean
  @property({ alias: 'base.content', fallback: () => [] }) declare content: Text['content']
  @property({ alias: 'base.effects' }) declare effects: Text['effects']
  @property({ alias: 'base.fill' }) declare fill: Text['fill']
  @property({ alias: 'base.outline' }) declare outline: Text['outline']
  @property({ protected: true, alias: 'base.measureDom' }) declare measureDom: Text['measureDom']
  @property({ protected: true, alias: 'base.fonts' }) declare fonts: Text['fonts']

  readonly base = new Text()
  measureResult?: MeasureResult

  constructor(
    public parent: BaseElement2D,
  ) {
    super()
    this.base.on('updateProperty', (...args) => {
      switch (args[0]) {
        case 'content':
        case 'effects':
        case 'fill':
        case 'outline':
          this.setter(args[0], args[1])
          break
      }
      this._updateProperty(...args)
    })
  }

  override setProperties(properties?: TextProperties): this {
    return super.setProperties(
      isNone(properties)
        ? undefined
        : normalizeText(properties),
    )
  }

  protected override _updateProperty(key: string, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'enabled':
      case 'content':
      case 'effects':
      case 'measureDom':
      case 'fonts':
      case 'fill':
      case 'outline':
        this.parent.requestRedraw()
        break
    }
  }

  setContent(content: TextContent): void {
    this.content = normalizeTextContent(content)
  }

  measure(): MeasureResult {
    this.base.style = {
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      ...this.parent.style.toJSON() as any,
    }
    this.base.requestUpdate()
    return this.base.measure()
  }

  updateMeasure(): this {
    this.measureResult = this.measure()
    return this
  }

  canDraw(): boolean {
    return Boolean(
      this.enabled
      && !/^\s*$/.test(this.base.toString()),
    )
  }

  draw(): void {
    const ctx = this.parent.context
    this.base.update()
    this.base.pathSets.forEach((pathSet) => {
      pathSet.paths.forEach((path) => {
        ctx.addPath(path)
        ctx.style = { ...path.style }
        ctx.fill()
      })
    })
  }
}
