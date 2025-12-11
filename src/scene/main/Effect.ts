import type { GlRenderer, RectangleLike } from '../../core'
import type { Material } from '../resources'
import type { Rectangulable } from './interfaces'
import type { Node } from './Node'
import type { SceneTree } from './SceneTree'
import type { TimelineNodeEvents, TimelineNodeProperties } from './TimelineNode'
import { property } from 'modern-idoc'
import { assets } from '../../asset'
import { Aabb2D, customNode } from '../../core'
import { EffectMaterial, QuadUvGeometry } from '../resources'
import { TimelineNode } from './TimelineNode'
import { Viewport } from './Viewport'

export type EffectMode = 'before' | 'parent' | 'children' | 'transition'

export interface EffectProperties extends TimelineNodeProperties {
  effectMode?: EffectMode
  glsl?: string
  glslSrc?: string
  material?: Material
}

export interface EffectContext {
  redraw?: boolean
  /** parent redraw */
  target?: Node
  /** transition */
  from?: Viewport
  to?: Viewport
}

export interface EffectEvents extends TimelineNodeEvents {
  updateRect: []
}

export interface Effect {
  on: <K extends keyof EffectEvents & string>(event: K, listener: (...args: EffectEvents[K]) => void) => this
  once: <K extends keyof EffectEvents & string>(event: K, listener: (...args: EffectEvents[K]) => void) => this
  off: <K extends keyof EffectEvents & string>(event: K, listener: (...args: EffectEvents[K]) => void) => this
  emit: <K extends keyof EffectEvents & string>(event: K, ...args: EffectEvents[K]) => this
}

@customNode('Effect')
export class Effect extends TimelineNode implements Rectangulable {
  @property({ internal: true }) material?: Material
  @property() declare effectMode?: EffectMode
  @property() declare glsl?: string
  @property() declare glslSrc?: string

  needsRender = true

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

  protected _rect: RectangleLike = { x: 0, y: 0, width: 0, height: 0 }

  constructor(properties?: Partial<EffectProperties>, children: Node[] = []) {
    super()
    this._onProcessing = this._onProcessing.bind(this)
    this._onNodeProcessed = this._onNodeProcessed.bind(this)

    this
      .setProperties(properties)
      .append(children)
  }

  requestRender(): void {
    this.needsRender = true
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

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
    if (!this.canProcess())
      return
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
    if (!this.canProcess())
      return
    if (!this.isInsideTimeRange())
      return
    const renderStack = this._tree?.renderStack
    if (!renderStack)
      return
    switch (this._effectMode) {
      case 'transition':
        if (node.equal(this._previousSibling)) {
          this._previousSibling = undefined
          renderStack.push(this)
        }
        else if (node.equal(this._nextSibling)) {
          this._nextSibling = undefined
          renderStack.push(this)
        }
        break
    }
  }

  getRect(): Aabb2D {
    return new Aabb2D(this._rect)
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
    const minMax = {
      minX: Number.MAX_SAFE_INTEGER,
      minY: Number.MAX_SAFE_INTEGER,
      maxX: 0,
      maxY: 0,
    }
    calls.forEach((call, index) => {
      const renderable = call.renderable
      if (
        renderable.equal(this._parent)
        || renderable.parent?.equal(this._parent)
      ) {
        if (renderable.needsRender) {
          this.requestRender()
        }
        if ('getRect' in renderable) {
          const _rect = (renderable.getRect as any)() as RectangleLike
          const points = {
            x: [_rect.x, _rect.x + _rect.width],
            y: [_rect.y, _rect.y + _rect.height],
          }
          minMax.minX = Math.min(...points.x)
          minMax.maxX = Math.max(...points.x)
          minMax.minY = Math.min(...points.y)
          minMax.maxY = Math.max(...points.y)
        }
        start = start ?? index
        end = index
      }
    })

    if (start === undefined || end === undefined)
      return

    const rect = {
      x: minMax.minX,
      y: minMax.minY,
      width: minMax.maxX - minMax.minX,
      height: minMax.maxY - minMax.minY,
    }

    if (
      rect.width === Number.MAX_SAFE_INTEGER
      || rect.height === Number.MAX_SAFE_INTEGER
    ) {
      return
    }

    if (
      !this.needsRender
      && (
        this._rect.width !== rect.width
        || this._rect.height !== rect.height
      )
    ) {
      this.requestRender()
    }

    if (this.needsRender) {
      calls.splice(end + 1, 0, renderStack.createCall(this))
      calls.splice(start, 0, renderStack.createCall(this))
    }
    else {
      calls.splice(start, end + 1, renderStack.createCall(this))
    }

    if (
      this._rect.x !== rect.x
      || this._rect.y !== rect.y
      || this._rect.width !== rect.width
      || this._rect.height !== rect.height
    ) {
      this._rect = rect
      this.emit('updateRect')
    }
  }

  protected _processChildren(): void {
    if (this.children.length) {
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

  protected _renderBefore(renderer: GlRenderer): void {
    const currentViewport = this._tree?.getCurrentViewport()
    if (currentViewport) {
      this.apply(renderer, currentViewport, { redraw: true })
    }
  }

  protected _renderTransition(renderer: GlRenderer): void {
    const currentViewport = this._tree?.getCurrentViewport()
    if (this._renderId % 2 === 0) {
      this._renderViewport = currentViewport
      if (currentViewport) {
        const isRoot = currentViewport.renderTarget.isRoot
        this.viewport1.activateWithCopy(renderer, currentViewport)
        this.viewport1.renderTargets.forEach(t => t.isRoot = isRoot)
        this.viewport1.canvasTransform.copy(currentViewport.canvasTransform)
        this.viewport2.resize(currentViewport.width, currentViewport.height)
        this.viewport2.renderTargets.forEach(t => t.isRoot = isRoot)
        this.viewport2.canvasTransform.copy(currentViewport.canvasTransform)
        this.viewport2.renderStart(renderer)
      }
    }
    else {
      const oldViewport = this._renderViewport
      if (
        currentViewport
        && currentViewport.equal(this.viewport2)
        && oldViewport
        && !oldViewport.equal(this.viewport2)
      ) {
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
        this._renderViewport = undefined
      }
    }
    this._renderId++
  }

  protected _renderParentOrChildren(renderer: GlRenderer): void {
    const currentViewport = this._tree?.getCurrentViewport()
    const rect = this._rect
    if (this.needsRender) {
      if (this._renderId % 2 === 0) {
        this._renderViewport = currentViewport
        if (rect.width && rect.height) {
          this.viewport1.resize(rect.width, rect.height)
        }
        this.viewport1.canvasTransform.identity().translate(-rect.x, -rect.y)
        this.viewport1.renderStart(renderer)
      }
      else {
        if (
          currentViewport
          && currentViewport.equal(this.viewport1)
          && this._renderViewport
          && !this._renderViewport.equal(this.viewport1)
        ) {
          this.apply(renderer, this.viewport1, {
            redraw: true,
            target: this._effectMode === 'parent'
              ? (this._parent ?? undefined)
              : undefined,
          })
          this._renderViewport.activate(renderer)
          this._renderViewport = undefined
          renderer.batch2D.render({
            vertices: new Float32Array([
              rect.x, rect.y,
              rect.x + rect.width, rect.y,
              rect.x + rect.width, rect.y + rect.height,
              rect.x, rect.y + rect.height,
            ]),
            uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
            indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
            texture: this.viewport1.texture,
          })
          this.needsRender = false
        }
      }
      this._renderId++
    }
    else {
      renderer.batch2D.render({
        vertices: new Float32Array([
          rect.x, rect.y,
          rect.x + rect.width, rect.y,
          rect.x + rect.width, rect.y + rect.height,
          rect.x, rect.y + rect.height,
        ]),
        uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
        texture: this.viewport1.texture,
      })
    }
  }

  protected override _render(renderer: GlRenderer): void {
    switch (this._effectMode) {
      case 'before':
        this._renderBefore(renderer)
        this._renderId++
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
  }

  apply(renderer: GlRenderer, viewport: Viewport, context?: EffectContext): void {
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
