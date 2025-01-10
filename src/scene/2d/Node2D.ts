import type { CanvasBatchable, CanvasItemProperties } from '../main'
import { BoundingBox } from 'modern-path2d'
import { customNode, Transform2D } from '../../core'
import { CanvasItem } from '../main'

export interface Node2DProperties extends CanvasItemProperties {
  //
}

@customNode({
  tag: 'Node2D',
  renderable: true,
})
export class Node2D extends CanvasItem {
  readonly _transform = new Transform2D()
  protected _parentTransformDirtyId?: number

  constructor(properties?: Partial<Node2DProperties>) {
    super()
    this.setProperties(properties)
  }

  getBoundingBox(): BoundingBox {
    let { left, top, width, height, rotate } = this.style
    if (rotate) {
      rotate = Math.abs(rotate % 180)
      rotate = (rotate / 180) * Math.PI
      const sin = Math.abs(Math.sin(rotate))
      const cos = Math.abs(Math.cos(rotate))
      const newWidth = height * sin + width * cos
      const newHeight = height * cos + width * sin
      left += (width - newWidth) / 2
      top += (height - newHeight) / 2
      width = newWidth
      height = newHeight
    }
    return new BoundingBox(left, top, width, height)
  }

  protected override _onUpdateStyleProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateStyleProperty(key, value, oldValue)

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
    const parentTransform = parent?._transform
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
        0,
        0,
        1,
      ]
    }
    else {
      transform = t3dT2d
    }
    this._transform.set(transform)
    this._updateOverflow()
    this.requestReflow()
  }

  protected _updateOverflow(): void {
    if (this.style.overflow === 'hidden') {
      const [a, c, tx, b, d, ty] = this._transform.toArray()
      const width = this.style.width
      const height = this.style.height
      this.mask = {
        x: tx,
        y: ty,
        width: (a * width) + (c * height),
        height: (b * width) + (d * height),
      }
    }
    else {
      this.mask = undefined
    }
  }

  protected _transformVertices(vertices: number[]): number[] {
    const [a, c, tx, b, d, ty] = this._transform.toArray()
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
    if (parent?._transform?.dirtyId !== this._parentTransformDirtyId) {
      this._updateTransform()
    }
    super._process(delta)
  }

  override input(event: UIEvent): void {
    super.input(event)

    if (!event.target && this.isRenderable()) {
      const { screenX, screenY } = event as PointerEvent
      if (screenX && screenY) {
        const { width, height } = this.style
        const [x, y] = this._transform.inverse().applyToPoint(screenX, screenY)
        if (x >= 0 && x < width && y >= 0 && y < height) {
          (event as any).target = this
        }
      }
    }
  }
}
