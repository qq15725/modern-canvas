import type { Vector2Like } from 'modern-path2d'
import type {
  CanvasBatchable,
  CanvasItemEvents,
  CanvasItemProperties,
  Node,
} from '../main'
import { Transform2D, Vector2 } from 'modern-path2d'
import { customNode } from '../../core'
import { CanvasItem } from '../main'

export interface Node2DProperties extends CanvasItemProperties {
  //
}

// Scratch transform for folding a parent's contentOffset into the child's global
// transform. Used and consumed synchronously inside updateGlobalTransform (which
// never recurses into another node's updateGlobalTransform), so a single shared
// instance is safe and avoids a per-frame allocation.
const _contentTransform = new Transform2D()

export interface Node2DEvents extends CanvasItemEvents {
  updateGlobalTransform: []
}

export interface Node2D {
  on: <K extends keyof Node2DEvents & string>(event: K, listener: (...args: Node2DEvents[K]) => void) => this
  once: <K extends keyof Node2DEvents & string>(event: K, listener: (...args: Node2DEvents[K]) => void) => this
  off: <K extends keyof Node2DEvents & string>(event: K, listener: (...args: Node2DEvents[K]) => void) => this
  emit: <K extends keyof Node2DEvents & string>(event: K, ...args: Node2DEvents[K]) => this
}

@customNode('Node2D')
export class Node2D extends CanvasItem {
  rotation = 0
  readonly position = new Vector2(0, 0, () => this.updateGlobalTransform())
  /**
   * Scroll/content offset (in this node's local space) applied only to its
   * children's global transform — the node's own transform, globalAabb and
   * overflow-clip box are unaffected. Runtime UI state, not serialized: lets a
   * frame scroll its overflowing content while its clip box stays put.
   */
  readonly contentOffset = new Vector2(0, 0, () => this.updateGlobalTransform())
  readonly scale = new Vector2(1, 1, () => this.updateGlobalTransform())
  readonly skew = new Vector2(0, 0, () => this.updateGlobalTransform())
  readonly pivot = new Vector2(0, 0, () => this.updateGlobalTransform())
  readonly extraTransform = new Transform2D()
  readonly transform = new Transform2D()
  readonly globalPosition = new Vector2()
  globalRotation = 0
  readonly globalScale = new Vector2()
  readonly globalSkew = new Vector2()
  readonly globalTransform = new Transform2D()

  parentTransformDirtyId?: number
  transformDirtyId = 0

  constructor(properties?: Partial<Node2DProperties>, nodes: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(nodes)
  }

  protected _updateTransform(): void {
    this.transform
      .identity()
      .translate(-this.pivot.x, -this.pivot.y)
      .scale(this.scale.x, this.scale.y)
      .skew(this.skew.x, this.skew.y)
      .rotate(this.rotation)
      .append(this.extraTransform)
      .translate(this.position.x, this.position.y)
      .translate(this.pivot.x, this.pivot.y)
    this.transformDirtyId++
  }

  updateGlobalTransform(): void {
    this._updateTransform()
    const parent = this.getParent<Node2D>()
    if (parent?.globalTransform) {
      const {
        globalPosition,
        globalScale,
        globalSkew,
        globalRotation,
        transformDirtyId,
        contentOffset,
      } = parent
      this.parentTransformDirtyId = transformDirtyId
      const ox = contentOffset.x
      const oy = contentOffset.y
      this.globalPosition.set(globalPosition.x + this.position.x - ox, globalPosition.y + this.position.y - oy)
      this.globalScale.set(globalScale.x * this.scale.x, globalScale.y * this.scale.y)
      this.globalSkew.set(globalSkew.x * this.skew.x, globalSkew.y * this.skew.y)
      this.globalRotation = globalRotation + this.rotation
      if (ox !== 0 || oy !== 0) {
        // Fold the parent's content offset (a translation in parent-local space)
        // into its global transform: g · T(-offset). Done as a proper local
        // post-translate so it stays correct under parent scale / rotation.
        const g = parent.globalTransform
        _contentTransform.copyFrom(g)
        _contentTransform.tx = g.tx - (ox * g.a) - (oy * g.c)
        _contentTransform.ty = g.ty - (ox * g.b) - (oy * g.d)
        this.globalTransform.appendFrom(this.transform, _contentTransform)
      }
      else {
        this.globalTransform.appendFrom(
          this.transform,
          parent.globalTransform,
        )
      }
    }
    else {
      this.globalPosition.copyFrom(this.position)
      this.globalScale.copyFrom(this.scale)
      this.globalSkew.copyFrom(this.skew)
      this.globalRotation = this.rotation
      this.globalTransform.copyFrom(this.transform)
    }
    this.requestLayout()
    this.emit('updateGlobalTransform')
  }

  protected override _relayout(batchables: CanvasBatchable[], oldBatchables: CanvasBatchable[]): CanvasBatchable[] {
    return super._relayout(batchables, oldBatchables).map((newBatchable, index) => {
      const vertices = batchables[index].vertices
      const newVertices = newBatchable.vertices
      const { a, c, tx, b, d, ty } = this.globalTransform
      const transform = newBatchable.transformVertex ?? (() => {})
      let x, y
      for (let len = vertices.length, i = 0; i < len; i += 2) {
        x = vertices[i]
        y = vertices[i + 1]
        newVertices[i] = (a * x) + (c * y) + tx
        newVertices[i + 1] = (b * x) + (d * y) + ty
        transform(newVertices, i)
      }
      return newBatchable
    })
  }

  protected override _process(delta: number): void {
    super._process(delta)
    const parent = this.getParent<Node2D>()
    if (
      parent
      && parent.globalTransform
      && this.parentTransformDirtyId !== parent.transformDirtyId
    ) {
      this.updateGlobalTransform()
    }
  }

  toLocal<P extends Vector2Like = Vector2>(globalPos: Vector2Like, newPos?: P): P {
    return this.globalTransform.applyAffineInverse(globalPos, newPos)
  }

  toGlobal<P extends Vector2Like = Vector2>(localPos: Vector2Like, newPos?: P): P {
    return this.globalTransform.apply(localPos, newPos)
  }

  protected override _destroy(): void {
    super._destroy()
    this.position.destroy()
    this.scale.destroy()
    this.skew.destroy()
    this.pivot.destroy()
    this.extraTransform.destroy()
    this.transform.destroy()
    this.globalPosition.destroy()
    this.globalScale.destroy()
    this.globalSkew.destroy()
    this.globalTransform.destroy()
  }
}
