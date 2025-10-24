import type { Vector2Data } from '../../core'
import type {
  CanvasBatchable,
  CanvasItemEvents,
  CanvasItemProperties,
  Node,
} from '../main'
import { property } from 'modern-idoc'
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
  @property({ internal: true, fallback: 0 }) declare rotation: number
  readonly position = new Vector2().on('update', () => this.updateGlobalTransform())
  readonly scale = new Vector2(1, 1).on('update', () => this.updateGlobalTransform())
  readonly skew = new Vector2().on('update', () => this.updateGlobalTransform())
  readonly pivot = new Vector2().on('update', () => this.updateGlobalTransform())
  readonly extraTransform = new Transform2D()
  readonly transform = new Transform2D()
  readonly globalPosition = new Vector2()
  @property({ internal: true, fallback: 0 }) declare globalRotation: number
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

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'rotation':
        this.updateGlobalTransform()
        break
    }
  }

  updateTransform(): void {
    this.transform
      .identity()
      .translate(-this.pivot.x, -this.pivot.y)
      .scale(this.scale.x, this.scale.y)
      .skew(this.skew.x, this.skew.y)
      .rotate(this.rotation)
      .multiply(this.extraTransform)
      .translate(this.position.x, this.position.y)
      .translate(this.pivot.x, this.pivot.y)
  }

  updateGlobalTransform(): void {
    this.updateTransform()
    const parent = this.getParent<Node2D>()
    if (parent?.globalTransform) {
      const {
        globalPosition,
        globalScale,
        globalSkew,
        globalTransform,
        globalRotation,
      } = parent
      this._parentTransformDirtyId = globalTransform.dirtyId
      this.globalPosition.set(globalPosition.x + this.position.x, globalPosition.y + this.position.y)
      this.globalScale.set(globalScale.x * this.scale.x, globalScale.y * this.scale.y)
      this.globalSkew.set(globalSkew.x * this.skew.x, globalSkew.y * this.skew.y)
      this.globalRotation = globalRotation + this.rotation
      parent.globalTransform.multiply(this.transform, this.globalTransform)
    }
    else {
      this.globalPosition.copy(this.position)
      this.globalScale.copy(this.scale)
      this.globalSkew.copy(this.skew)
      this.globalRotation = this.rotation
      this.globalTransform.copy(this.transform)
    }
    this.requestRelayout()
  }

  protected _transformVertices(vertices: Float32Array, vertTransform?: Transform2D): Float32Array {
    let a, c, tx, b, d, ty
    if (vertTransform) {
      const globalTransform = this.globalTransform.clone()
      globalTransform.multiply(vertTransform)
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
    batchables = super._relayout(batchables)
    this.updateGlobalTransform()
    return batchables.map((batchable) => {
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

  toLocal<P extends Vector2Data = Vector2>(globalPos: Vector2Data, newPos?: P): P {
    return this.globalTransform.applyAffineInverse(globalPos, newPos)
  }

  toGlobal<P extends Vector2Data = Vector2>(localPos: Vector2Data, newPos?: P): P {
    return this.globalTransform.apply(localPos, newPos)
  }
}
