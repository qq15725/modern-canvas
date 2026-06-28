import type { Foreground, NormalizedForeground } from 'modern-idoc'
import { isNone, normalizeForeground, property } from 'modern-idoc'
import { Element2DFill } from './Element2DFill'

/**
 * 前景 = 带「图片处理管线」的填充。管线（描边/调色/抠图等图片样式）由基类
 * `Element2DFill` 在图片加载时经注入的解析器烘焙到运行时纹理，本类只在 `Fill`
 * 之上补充 `fillWithShape`（前景按形状裁切）。
 */
export class Element2DForeground extends Element2DFill implements NormalizedForeground {
  @property() declare fillWithShape: NormalizedForeground['fillWithShape']

  override setProperties(properties?: Foreground): this {
    return super._setProperties(
      isNone(properties)
        ? undefined
        : normalizeForeground(properties),
    )
  }

  protected _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    if (key === 'fillWithShape') {
      this._parent.requestDraw()
    }
  }
}
