import type { CanvasBatchable, CanvasItemProperties, Node } from '../main'
import { customNode, Transform2D, Vector2 } from '../../core'
import { CanvasItem } from '../main'

export interface Node2DProperties extends CanvasItemProperties {
  //
}

@customNode('Node2D')
export class Node2D extends CanvasItem {
  position = new Vector2()
  rotation = 0
  scale = new Vector2(1, 1)
  skew = new Vector2()
  transform = new Transform2D()
  globalPosition = new Vector2()
  globalRotation = 0
  globalScale = new Vector2()
  globalSkew = new Vector2()
  globalTransform = new Transform2D()

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
      .scale(this.scale.x, this.scale.y)
      .skew(this.skew.x, this.skew.y)
      .rotate(this.rotation)
      .translate(this.position.x, this.position.y)
  }

  protected _updateGlobalTransform(): void {
    const parent = this.getParent<Node2D>()
    if (parent?.globalTransform) {
      this._parentTransformDirtyId = parent.globalTransform.dirtyId
      this.globalScale.set(parent.globalScale.x * this.scale.x, parent.globalScale.y * this.scale.y)
      this.globalRotation = parent.globalRotation + this.rotation
      parent.globalTransform.multiply(this.transform, this.globalTransform)
    }
    else {
      this.globalScale = this.scale.clone()
      this.globalRotation = this.rotation
      this.globalTransform = this.transform.clone()
    }
    const [
      a, c, tx,
      b, d, ty,
    ] = this.globalTransform.toArray()
    this.globalPosition.set(tx, ty)
    this.globalSkew.x = Math.atan2(c, a) - this.globalRotation
    this.globalSkew.y = Math.atan2(b, d) - this.globalRotation
    this.requestRelayout()
  }

  protected _transformVertices(vertices: number[]): number[] {
    const [a, c, tx, b, d, ty] = this.globalTransform.toArray()
    const newVertices = vertices.slice()
    for (let len = vertices.length, i = 0; i < len; i += 2) {
      const x = vertices[i]
      const y = vertices[i + 1]
      newVertices[i] = (a * x) + (c * y) + tx
      newVertices[i + 1] = (b * x) + (d * y) + ty
    }
    return newVertices
  }

  protected override _relayout(batchables: CanvasBatchable[]): CanvasBatchable[] {
    this._updateTransform()
    this._updateGlobalTransform()
    return super._relayout(batchables).map((batchable) => {
      return {
        ...batchable,
        vertices: this._transformVertices(batchable.vertices),
      }
    })
  }

  protected override _process(delta: number): void {
    super._process(delta)
    const parent = this.getParent<Node2D>()
    if (
      parent?.globalTransform
      && this._parentTransformDirtyId !== parent?.globalTransform?.dirtyId
    ) {
      this.requestRelayout()
    }
  }
}
