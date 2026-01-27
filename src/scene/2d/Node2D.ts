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
  readonly position = new Vector2().on('update', () => this.updateGlobalTransform())
  readonly scale = new Vector2(1, 1).on('update', () => this.updateGlobalTransform())
  readonly skew = new Vector2().on('update', () => this.updateGlobalTransform())
  readonly pivot = new Vector2().on('update', () => this.updateGlobalTransform())
  readonly extraTransform = new Transform2D()
  readonly transform = new Transform2D()
  readonly globalPosition = new Vector2()
  globalRotation = 0
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
    const px = this.pivot.x
    const py = this.pivot.y
    const sx = this.scale.x
    const sy = this.scale.y
    const kx = this.skew.x
    const ky = this.skew.y
    const r = this.rotation
    const cos = Math.cos(r)
    const sin = Math.sin(r)
    const a = cos * sx - sin * sy * ky
    const b = sin * sx + cos * sy * ky
    const c = -sin * sx + cos * sy * kx
    const d = cos * sx + sin * sy * kx
    const tx0 = -px * a - py * c
    const ty0 = -px * b - py * d
    const tx1 = tx0 + this.position.x + px
    const ty1 = ty0 + this.position.y + py
    const m = this.transform
    m.set([
      a, c, tx1,
      b, d, ty1,
      0, 0, 1,
    ])
    m.multiply(this.extraTransform)
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
    this.requestLayout()
  }

  protected _transformVertices(batchable: CanvasBatchable): Float32Array {
    const { a, c, tx, b, d, ty } = this.globalTransform.toObject()
    const vertices = batchable.vertices
    const len = batchable.vertices.length
    const newVertices = new Float32Array(len)
    const transform = batchable.transformVertex ?? (() => {})
    let x, y
    for (let i = 0; i < len; i += 2) {
      x = vertices[i]
      y = vertices[i + 1]
      newVertices[i] = (a * x) + (c * y) + tx
      newVertices[i + 1] = (b * x) + (d * y) + ty
      transform(newVertices, i)
    }
    return newVertices
  }

  protected override _relayout(batchables: CanvasBatchable[]): CanvasBatchable[] {
    batchables = super._relayout(batchables)
    this.updateGlobalTransform()
    return batchables.map((batchable) => {
      return {
        ...batchable,
        vertices: this._transformVertices(batchable),
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
      this.requestLayout()
    }
  }

  toLocal<P extends Vector2Like = Vector2>(globalPos: Vector2Like, newPos?: P): P {
    return this.globalTransform.applyAffineInverse(globalPos, newPos)
  }

  toGlobal<P extends Vector2Like = Vector2>(localPos: Vector2Like, newPos?: P): P {
    return this.globalTransform.apply(localPos, newPos)
  }
}
