import type { Connection, NormalizedConnection, ShapeConnectionPoint } from 'modern-idoc'
import type { Vector2Like } from 'modern-path2d'
import type { Element2D } from './Element2D'
import { isNone, normalizeConnection, property } from 'modern-idoc'
import { Vector2 } from 'modern-path2d'
import { CoreObject } from '../../../core'

export class Element2DConnection extends CoreObject implements NormalizedConnection {
  @property() declare start: NormalizedConnection['start']
  @property() declare end: NormalizedConnection['end']

  constructor(protected _parent: Element2D) {
    super()
  }

  override setProperties(properties?: Record<string, any>): this {
    return super.setProperties(
      isNone(properties)
        ? undefined
        : normalizeConnection(properties as Connection),
    )
  }

  isValid(): boolean {
    return Boolean(this.start?.id || this.end?.id)
  }

  protected _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)
    switch (key) {
      case 'start':
      case 'end':
        this._parent.requestDraw()
        break
    }
  }

  /**
   * Resolve an anchor to a world-space point.
   * If idx is specified, uses the target shape's connectionPoints;
   * otherwise falls back to the target's globalAabb center.
   */
  resolveAnchor(anchor: NormalizedConnection['start']): Vector2 | undefined {
    if (!anchor?.id)
      return undefined

    const target = this._parent.tree?.getNodeById<Element2D>(anchor.id)
    if (!target)
      return undefined

    if (anchor.idx !== undefined) {
      const cp = target.shape.connectionPoints?.find(
        (p: ShapeConnectionPoint) => p.idx === anchor.idx,
      )
      if (cp) {
        const local: Vector2Like = {
          x: cp.x * target.size.x,
          y: cp.y * target.size.y,
        }
        return target.globalTransform.apply(new Vector2(local.x, local.y))
      }
    }

    const { min, size } = target.globalAabb
    return new Vector2(min.x + size.x / 2, min.y + size.y / 2)
  }
}
