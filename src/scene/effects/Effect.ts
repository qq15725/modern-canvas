import type { Node2D } from '../2d'
import type { WebGLRenderer } from '../../core'
import type { NodeProperties } from '../main'
import type { Material } from '../resources'
import { assets } from '../../asset'
import { customNode, property, protectedProperty } from '../../core'
import { Node, Viewport } from '../main'
import { EffectMaterial, QuadUvGeometry } from '../resources'

export type EffectMode =
  // Apply the effect to all previous nodes
  | 'before'
  // Apply the effect to parent node
  | 'parent'
  // Apply the effect to all child nodes
  | 'children'
  // Apply the effect to previous node and next node
  | 'transition'

export interface EffectOptions extends NodeProperties {
  mode?: EffectMode
  glsl?: string
  glslSrc?: string
  material?: Material
}

export interface EffectContext {
  redraw?: boolean
  /** parent redraw */
  target?: Node
  targetArea?: [number, number, number, number]
  /** transition */
  from?: Viewport
  to?: Viewport
}

@customNode('Effect')
export class Effect extends Node {
  @protectedProperty() material?: Material

  @property() mode?: EffectMode
  @property({ default: '' }) declare glsl: string
  @property({ default: '' }) declare glslSrc: string

  protected get _mode(): EffectMode { return this.mode ?? 'parent' }

  /** Viewports */
  readonly viewport1 = new Viewport()
  readonly viewport2 = new Viewport()

  /** Render call */
  protected _renderId = 0
  protected _renderViewport?: Viewport

  /** Temporary nodes for transition */
  protected _previousSibling?: Node
  protected _nextSibling?: Node

  constructor(options?: EffectOptions) {
    super()
    this._onProcessing = this._onProcessing.bind(this)
    this._onNodeProcessed = this._onNodeProcessed.bind(this)
    this.setProperties(options)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'glsl': {
        const material = new EffectMaterial(value)
        if (!this.mode && material.has.transition) {
          this.mode = 'transition'
        }
        this.material = material
        break
      }
      case 'glslSrc': {
        if (value) {
          assets.text.load(value).then(glsl => (this.glsl = glsl))
        }
        else {
          this.glsl = ''
        }
        break
      }
    }
  }

  protected override _enterTree(): void {
    const tree = this._tree!
    tree.on('processing', this._onProcessing)
    tree.on('nodeProcessed', this._onNodeProcessed)
    this.viewport1.setTree(tree)
    this.viewport2.setTree(tree)
  }

  protected override _exitTree(): void {
    const tree = this._tree!
    tree.off('processing', this._onProcessing)
    tree.off('nodeProcessed', this._onNodeProcessed)
    this.viewport1.setTree(undefined)
    this.viewport2.setTree(undefined)
  }

  protected _onProcessing(): void {
    this._updateTime()
    switch (this._mode) {
      case 'transition':
        this._previousSibling = this.previousSibling
        this._nextSibling = this.nextSibling
        break
      default:
        this._previousSibling = undefined
        this._nextSibling = undefined
        break
    }
  }

  protected _onNodeProcessed(node: Node): void {
    if (!this.isInsideTime())
      return
    const renderStack = this._tree?.renderStack
    if (!renderStack)
      return
    switch (this._mode) {
      case 'transition':
        if (node.is(this._previousSibling)) {
          this._previousSibling = undefined
          renderStack.push(this)
        }
        else if (node.is(this._nextSibling)) {
          this._nextSibling = undefined
          renderStack.push(this)
        }
        break
    }
  }

  protected _processParent(): void {
    const renderStack = this._tree?.renderStack
    if (!renderStack)
      return
    const parentParentCall = renderStack.currentCall?.parentCall
    if (!parentParentCall)
      return
    const calls = parentParentCall.calls
    let start: number | undefined
    let end: number | undefined
    calls.forEach((call, index) => {
      if (call.renderable.is(this._parent) || call.renderable.parent?.is(this._parent)) {
        start = start ?? index
        end = index
      }
    })
    if (start === undefined || end === undefined)
      return
    calls.splice(end + 1, 0, renderStack.createCall(this))
    calls.splice(start, 0, renderStack.createCall(this))
  }

  protected _processChildren(): void {
    if (this._children.length) {
      super.emit('process')
      this._tree?.renderStack.push(this)
    }
  }

  override _onProcess(delta = 0): void {
    this._renderId = 0
    switch (this._mode) {
      case 'before':
        super._onProcess(delta)
        break
      case 'parent':
        this._processParent()
        break
      case 'children':
        this._processChildren()
        break
      default:
        // skip
        break
    }
  }

  protected _renderBefore(renderer: WebGLRenderer): void {
    const viewport1 = this._tree?.getCurrentViewport()
    if (viewport1) {
      this.apply(renderer, viewport1, { redraw: true })
    }
  }

  protected _renderTransition(renderer: WebGLRenderer): void {
    if (this._renderId % 2 === 0) {
      this._renderViewport = this._tree?.getCurrentViewport()
      if (this._renderViewport) {
        this.viewport1.activateWithCopy(renderer, this._renderViewport)
        this.viewport2.resize(this._renderViewport.width, this._renderViewport.height)
      }
      this.viewport2.activate(renderer)
      renderer.clear()
    }
    else {
      const oldViewport = this._renderViewport
      this._renderViewport = undefined
      if (oldViewport) {
        oldViewport.activate(renderer)
        renderer.clear()
        this.viewport1.texture.activate(renderer, 0)
        this.viewport2.texture.activate(renderer, 1)
        this.apply(renderer, oldViewport, {
          from: this.viewport1,
          to: this.viewport2,
        })
        renderer.texture.unbind(0)
        renderer.texture.unbind(1)
      }
    }
  }

  protected _renderParentOrChildren(renderer: WebGLRenderer): void {
    if (this._renderId % 2 === 0) {
      this._renderViewport = this._tree?.getCurrentViewport()
      if (this._renderViewport) {
        this.viewport1.resize(this._renderViewport.width, this._renderViewport.height)
      }
      this.viewport1.activate(renderer)
      renderer.clear()
    }
    else {
      const oldViewport = this._renderViewport
      this._renderViewport = undefined
      if (oldViewport) {
        this.viewport1.activate(renderer)
        this.apply(renderer, this.viewport1, {
          redraw: true,
          target: this._mode === 'parent'
            ? (this._parent ?? undefined)
            : undefined,
          targetArea: this._parseTargetArea() as any,
        })
        oldViewport.activate(renderer)
        this.viewport1.texture.activate(renderer, 0)
        QuadUvGeometry.draw(renderer)
      }
    }
  }

  protected _parseTargetArea(): number[] | undefined {
    if (this._mode === 'parent' && this._parent?.tag === 'Node2D') {
      const bbox = (this._parent as Node2D).getBoundingBox()
      return [
        bbox.left / this.viewport1.width,
        bbox.top / this.viewport1.height,
        bbox.width / this.viewport1.width,
        bbox.height / this.viewport1.height,
      ]
    }
  }

  protected override _render(renderer: WebGLRenderer): void {
    switch (this._mode) {
      case 'before':
        this._renderBefore(renderer)
        break
      case 'transition':
        this._renderTransition(renderer)
        break
      case 'parent':
      case 'children':
      default:
        this._renderParentOrChildren(renderer)
        break
    }
    this._renderId++
  }

  apply(renderer: WebGLRenderer, viewport: Viewport, context?: EffectContext): void {
    if (!this.material) {
      return
    }

    if (context?.redraw) {
      viewport.redraw(renderer, () => {
        QuadUvGeometry.draw(renderer, this.material!, {
          from: 0,
          to: 1,
          progress: this.timeProgress,
          ratio: viewport.width / viewport.height,
        })
      })
    }
    else {
      QuadUvGeometry.draw(renderer, this.material, {
        from: 0,
        to: 1,
        progress: this.timeProgress,
        ratio: context?.from ? context.from.width / context.from.height : 0,
      })
    }
  }
}
