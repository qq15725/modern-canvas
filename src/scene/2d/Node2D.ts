import type { InputEvent, InputEventKey, PointerInputEvent, PropertyDeclaration } from '../../core'
import type { CanvasBatchable, CanvasItemProperties, Node } from '../main'
import { customNode, Rect2, Transform2D } from '../../core'
import { CanvasItem } from '../main'

export interface Node2DProperties extends CanvasItemProperties {
  //
}

@customNode('Node2D')
export class Node2D extends CanvasItem {
  transform = new Transform2D()
  protected _parentTransformDirtyId?: number

  constructor(properties?: Partial<Node2DProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  protected _updateStyleProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateStyleProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'width':
      case 'height':
        if (this.mask instanceof Node2D) {
          this.mask.style.width = this.style.width
          this.mask.style.height = this.style.height
        }
        this.requestRedraw()
      // eslint-disable-next-line no-fallthrough
      case 'scaleX':
      case 'scaleY':
      case 'left':
      case 'top':
      case 'rotate':
      case 'transform':
      case 'transformOrigin':
        this._updateTransform()
        break
      case 'overflow':
        this._updateOverflow()
        break
    }
  }

  protected _updateTransform(): void {
    const parent = this.getParent() as Node2D
    const parentTransform = parent?.transform
    this._parentTransformDirtyId = parentTransform?.dirtyId
    const t3dT2d = this.style.getComputedTransform().toArray()
    let transform
    if (parentTransform) {
      const pt = parentTransform.toArray()
      transform = [
        (t3dT2d[0] * pt[0]) + (t3dT2d[3] * pt[1]),
        (t3dT2d[1] * pt[0]) + (t3dT2d[4] * pt[1]),
        (t3dT2d[2] * pt[0]) + (t3dT2d[5] * pt[1]) + pt[2],
        (t3dT2d[0] * pt[3]) + (t3dT2d[3] * pt[4]),
        (t3dT2d[1] * pt[3]) + (t3dT2d[4] * pt[4]),
        (t3dT2d[2] * pt[3]) + (t3dT2d[5] * pt[4]) + pt[5],
        0, 0, 1,
      ]
    }
    else {
      transform = t3dT2d
    }
    this.transform.set(transform)
    this._updateOverflow()
    this.requestReflow()
  }

  getRect(): Rect2 {
    const [a, c, tx, b, d, ty] = this.transform.toArray()
    const width = this.style.width
    const height = this.style.height
    return new Rect2(
      tx,
      ty,
      (a * width) + (c * height),
      (b * width) + (d * height),
    )
  }

  protected _updateOverflow(): void {
    if (this.style.overflow === 'hidden') {
      const rect = this.getRect()
      this.mask = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      }
    }
    else {
      this.mask = undefined
    }
  }

  protected _transformVertices(vertices: number[]): number[] {
    const [a, c, tx, b, d, ty] = this.transform.toArray()
    const newVertices = vertices.slice()
    for (let len = vertices.length, i = 0; i < len; i += 2) {
      const x = vertices[i]
      const y = vertices[i + 1]
      newVertices[i] = (a * x) + (c * y) + tx
      newVertices[i + 1] = (b * x) + (d * y) + ty
    }
    return newVertices
  }

  protected override _reflow(batchables: CanvasBatchable[]): CanvasBatchable[] {
    return super._reflow(
      batchables.map((batchable) => {
        return {
          ...batchable,
          vertices: this._transformVertices(batchable.vertices),
        }
      }),
    )
  }

  protected override _process(delta: number): void {
    const parent = this.getParent() as Node2D
    if (parent?.transform?.dirtyId !== this._parentTransformDirtyId) {
      this._updateTransform()
    }
    super._process(delta)
  }

  protected override _input(event: InputEvent, key: InputEventKey): void {
    super._input(event, key)

    if (!event.target && this.isVisibleInTree() && this.style.canPointeEvents()) {
      switch (key) {
        case 'pointerdown':
        case 'pointermove':
        case 'pointerup': {
          const { screenX, screenY } = event as PointerInputEvent
          if (screenX && screenY) {
            const { width, height } = this.style
            const [x, y] = this.transform.inverse().applyToPoint(screenX, screenY)
            if (x >= 0 && x < width && y >= 0 && y < height) {
              event.target = this
              this.emit(key, event)
            }
          }
          break
        }
      }
    }
  }

  clone(): this {
    return new (this.constructor as any)(
      this.toJSON(),
      this.getChildren(true),
    )
  }
}
