import type { PropertyDeclaration } from 'modern-idoc'
import type { CanvasBatchable, CanvasItemProperties, Node, VertTransform } from '../main'
import { customNode, protectedProperty, Transform2D, Vector2 } from '../../core'
import { CanvasItem } from '../main'

export interface Node2DProperties extends CanvasItemProperties {
  //
}

@customNode('Node2D')
export class Node2D extends CanvasItem {
  @protectedProperty({ default: 0 }) declare rotation: number
  readonly position = new Vector2().on('update', () => this.updateGlobalTransform())
  readonly scale = new Vector2(1, 1).on('update', () => this.updateGlobalTransform())
  readonly skew = new Vector2().on('update', () => this.updateGlobalTransform())
  readonly transform = new Transform2D()
  readonly globalPosition = new Vector2()
  @protectedProperty({ default: 0 }) declare globalRotation: number
  readonly globalScale = new Vector2()
  readonly globalSkew = new Vector2()
  readonly globalTransform = new Transform2D()

  protected _parentTransformDirtyId?: number

  constructor(properties?: Partial<Node2DProperties>, nodes: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(nodes)
  }

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'rotation':
        this.updateGlobalTransform()
        break
    }
  }

  getTransformOrigin(): Vector2 {
    return new Vector2(0, 0)
  }

  getTransform(cb?: (transform: Transform2D) => void): Transform2D {
    const origin = this.getTransformOrigin()

    const transform = new Transform2D()

    transform
      .translate(-origin.x, -origin.y)
      .scale(this.scale.x, this.scale.y)
      .skew(this.skew.x, this.skew.y)
      .rotate(this.rotation)

    cb?.(transform)

    transform
      .translate(this.position.x, this.position.y)
      .translate(origin.x, origin.y)

    return transform
  }

  updateTransform(): void {
    this.transform.copy(this.getTransform())
  }

  updateGlobalTransform(): void {
    this.updateTransform()
    const parent = this.getParent<Node2D>()
    if (parent?.globalTransform) {
      this._parentTransformDirtyId = parent.globalTransform.dirtyId
      this.globalScale.set(parent.globalScale.x * this.scale.x, parent.globalScale.y * this.scale.y)
      this.globalRotation = parent.globalRotation + this.rotation
      parent.globalTransform.multiply(this.transform, this.globalTransform)
    }
    else {
      this.globalScale.copy(this.scale)
      this.globalRotation = this.rotation
      this.globalTransform.copy(this.transform)
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

  protected _transformVertices(vertices: number[], vertTransform?: VertTransform): number[] {
    let a, c, tx, b, d, ty
    if (vertTransform) {
      const globalTransform = this.globalTransform.clone()
      globalTransform.multiply(
        typeof vertTransform === 'function'
          ? vertTransform?.()
          : vertTransform,
      )
      ;([a, c, tx, b, d, ty] = globalTransform.toArray())
    }
    else {
      ;([a, c, tx, b, d, ty] = this.globalTransform.toArray())
    }
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
    this.updateGlobalTransform()
    return super._relayout(batchables).map((batchable) => {
      return {
        ...batchable,
        vertices: this._transformVertices(batchable.vertices, batchable.vertTransform),
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
