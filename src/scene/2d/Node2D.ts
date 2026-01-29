import type { Vector2Like } from '../../core'
import type {
  CanvasBatchable,
  CanvasItemEvents,
  CanvasItemProperties,
  Node,
} from '../main'
import { customNode, Transform2D, Vector2 } from '../../core'
import { CanvasItem } from '../main'

export interface Node2DProperties extends CanvasItemProperties {
  //
}

export interface Node2DEvents extends CanvasItemEvents {
  //
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

  transformDirtyId = 0
  protected _parentTransformDirtyId?: number

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
      } = parent
      this._parentTransformDirtyId = transformDirtyId
      this.globalPosition.set(globalPosition.x + this.position.x, globalPosition.y + this.position.y)
      this.globalScale.set(globalScale.x * this.scale.x, globalScale.y * this.scale.y)
      this.globalSkew.set(globalSkew.x * this.skew.x, globalSkew.y * this.skew.y)
      this.globalRotation = globalRotation + this.rotation
      this.globalTransform.appendFrom(
        this.transform,
        parent.globalTransform,
      )
    }
    else {
      this.globalPosition.copyFrom(this.position)
      this.globalScale.copyFrom(this.scale)
      this.globalSkew.copyFrom(this.skew)
      this.globalRotation = this.rotation
      this.globalTransform.copyFrom(this.transform)
    }
    this.requestLayout()
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
      && this._parentTransformDirtyId !== parent.transformDirtyId
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
}
