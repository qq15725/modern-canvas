import type { PropertyDeclaration, WebGLRenderer } from '../../core'
import type { Material } from '../resources'
import type { Rectangulable } from './interfaces'
import type { Node } from './Node'
import type { SceneTree } from './SceneTree'
import type { TimelineNodeProperties } from './TimelineNode'
import { assets } from '../../asset'
import { customNode, property, protectedProperty } from '../../core'
import { EffectMaterial, QuadUvGeometry } from '../resources'
import { TimelineNode } from './TimelineNode'
import { Viewport } from './Viewport'

export type EffectMode = 'before' | 'parent' | 'children' | 'transition'

export interface EffectProperties extends TimelineNodeProperties {
  effectMode: EffectMode
  glsl: string
  glslSrc: string
  material: Material
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
export class Effect extends TimelineNode {
  @protectedProperty() declare material?: Material
  @property() declare effectMode?: EffectMode
  @property({ default: '' }) declare glsl: string
  @property({ default: '' }) declare glslSrc: string

  protected get _effectMode(): EffectMode { return this.effectMode ?? 'parent' }

  /** Viewports */
  readonly viewport1 = new Viewport()
  readonly viewport2 = new Viewport()

  /** Render call */
  protected _renderId = 0
  protected _renderViewport?: Viewport

  /** Temporary nodes for transition */
  protected _previousSibling?: Node
  protected _nextSibling?: Node

  constructor(properties?: Partial<EffectProperties>, children: Node[] = []) {
    super()
    this._onProcessing = this._onProcessing.bind(this)
    this._onNodeProcessed = this._onNodeProcessed.bind(this)

    this
      .setProperties(properties)
      .append(children)
  }

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'glsl': {
        const material = new EffectMaterial(value)
        if (!this.effectMode && material.has.transition) {
          this.effectMode = 'transition'
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

  protected override _treeEnter(tree: SceneTree): void {
    tree.on('processing', this._onProcessing)
    tree.on('nodeProcessed', this._onNodeProcessed)
    this.viewport1.setTree(tree)
    this.viewport2.setTree(tree)
  }

  protected override _treeExit(oldTree: SceneTree): void {
    oldTree.off('processing', this._onProcessing)
    oldTree.off('nodeProcessed', this._onNodeProcessed)
    this.viewport1.setTree(undefined)
    this.viewport2.setTree(undefined)
  }

  protected _onProcessing(): void {
    this._updateCurrentTime()
    switch (this._effectMode) {
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
    if (!this.isInsideTimeRange())
      return
    const renderStack = this._tree?.renderStack
    if (!renderStack)
      return
    switch (this._effectMode) {
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
    if (!this.canProcess())
      return
    this._renderId = 0
    switch (this._effectMode) {
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
          target: this._effectMode === 'parent'
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
    if (this._effectMode === 'parent' && this._parent && 'getRect' in this._parent) {
      const rect = (this._parent as Rectangulable).getRect()
      if (rect) {
        return [
          rect.left / this.viewport1.width,
          rect.top / this.viewport1.height,
          rect.width / this.viewport1.width,
          rect.height / this.viewport1.height,
        ]
      }
    }
  }

  protected override _render(renderer: WebGLRenderer): void {
    switch (this._effectMode) {
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
          progress: this.currentTimeProgress,
          ratio: viewport.width / viewport.height,
        })
      })
    }
    else {
      QuadUvGeometry.draw(renderer, this.material, {
        from: 0,
        to: 1,
        progress: this.currentTimeProgress,
        ratio: context?.from ? context.from.width / context.from.height : 0,
      })
    }
  }
}
