import type { Connection, ConnectionMode, NormalizedConnection, ShapeConnectionPoint } from 'modern-idoc'
import type { Path2D, Vector2Like } from 'modern-path2d'
import type { ConnectionEndpoint } from './connectionRouter'
import type { Element2D } from './Element2D'
import { isNone, normalizeConnection, property } from 'modern-idoc'
import { Vector2 } from 'modern-path2d'
import { CoreObject } from '../../../core'
import { axisDir, routeConnection } from './connectionRouter'

export class Element2DConnection extends CoreObject implements NormalizedConnection {
  @property() declare start: NormalizedConnection['start']
  @property() declare end: NormalizedConnection['end']
  /** Routing mode: `straight` | `orthogonal` | `curved` (normalized by modern-idoc). */
  @property({ fallback: 'straight' }) declare mode: ConnectionMode

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
      case 'mode':
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
    return this.resolveEndpoint(anchor)?.point as Vector2 | undefined
  }

  /**
   * Resolve an anchor to a world-space point and outward direction.
   * Direction comes from the connection point's `ang` if present, otherwise it is
   * inferred from which edge the point sits on; a centre fallback has no direction.
   */
  resolveEndpoint(anchor: NormalizedConnection['start']): ConnectionEndpoint | undefined {
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
        const point = target.globalTransform.apply(
          new Vector2(cp.x * target.size.x, cp.y * target.size.y),
        )
        let dir: Vector2Like | undefined
        if (cp.ang !== undefined) {
          dir = { x: Math.cos(cp.ang), y: Math.sin(cp.ang) }
        }
        else {
          // infer outward normal from the point's position on the unit shape
          dir = axisDir(cp.x - 0.5, cp.y - 0.5)
        }
        return { point, dir: rotateDir(dir, target.globalRotation) }
      }
    }

    const { min, size } = target.globalAabb
    return { point: new Vector2(min.x + size.x / 2, min.y + size.y / 2) }
  }

  /** Resolve both ends and return the routed world-space path. */
  route(): Path2D | undefined {
    const s = this.resolveEndpoint(this.start)
    const e = this.resolveEndpoint(this.end)
    if (!s && !e)
      return undefined
    return routeConnection(this.mode, s ?? e!, e ?? s!)
  }
}

function rotateDir(d: Vector2Like, ang: number): Vector2Like {
  if (!ang)
    return d
  const cos = Math.cos(ang)
  const sin = Math.sin(ang)
  return { x: d.x * cos - d.y * sin, y: d.x * sin + d.y * cos }
}
