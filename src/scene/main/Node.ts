import type { Visibility } from 'modern-idoc'
import type { CoreObjectEventMap, EventListenerOptions, EventListenerValue, Maskable, WebGLRenderer } from '../../core'
import type { SceneTree } from './SceneTree'
import type { Viewport } from './Viewport'
import { clamp, CoreObject, customNode, customNodes, property } from '../../core'

export interface NodeEventMap extends CoreObjectEventMap {
  enterTree: () => void
  exitTree: () => void
  childExitingTree: (node: Node) => void
  childEnteredTree: (node: Node) => void
  postEnterTree: () => void
  ready: () => void
  treeEntered: () => void
  treeExiting: () => void
  treeExited: () => void
  parented: () => void
  unparented: () => void
  process: (delta?: number) => void
  addChild: (child: Node) => void
  removeChild: (child: Node, index: number) => void
  moveChild: (child: Node, newIndex: number, oldIndex: number) => void
}

export interface Node {
  on: (<K extends keyof NodeEventMap>(type: K, listener: NodeEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof NodeEventMap>(type: K, listener: NodeEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof NodeEventMap>(type: K, ...args: Parameters<NodeEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export enum InternalMode {
  DEFAULT = 0,
  FRONT = 1,
  BACK = 2,
}

export interface NodeProperties {
  name: string
  mask: Maskable
  visibility: Visibility
  visibleDelay: number
  visibleDuration: number
}

@customNode('Node')
export class Node extends CoreObject {
  readonly declare tag: string

  renderable?: boolean

  // @ts-expect-error tag
  @property() name = `${this.tag}:${String(this.instanceId)}`
  @property() mask?: Maskable
  @property({ default: 'visible' }) declare visibility: Visibility
  @property({ default: 0 }) declare visibleDelay: number
  @property({ default: Number.MAX_SAFE_INTEGER }) declare visibleDuration: number

  /** @internal */
  _computedVisibleDelay = 0
  _computedVisibleDuration = Number.MAX_SAFE_INTEGER
  _computedVisibility: Visibility = 'visible'

  /** @internal */
  _internalMode = InternalMode.DEFAULT

  protected _readyed = false
  protected _tree?: SceneTree
  protected _parent?: Node
  protected _children: Node[] = []

  get children(): Node[] { return this.getChildren() }

  get visibleTimeline(): number[] {
    const delay = this._computedVisibleDelay
    return [delay, delay + this._computedVisibleDuration]
  }

  get visibleRelativeTime(): number { return (this._tree?.timeline.current ?? 0) - this.visibleTimeline[0] }
  get visibleProgress(): number {
    const [start, end] = this.visibleTimeline
    return clamp(0, this.visibleRelativeTime / (end - start), 1)
  }

  get siblingIndex(): number { return this.getIndex() }
  set siblingIndex(toIndex) { this._parent?.moveChild(this, toIndex) }
  get previousSibling(): Node | undefined { return this._parent?.getChildren()[this.getIndex() - 1] }
  get nextSibling(): Node | undefined { return this._parent?.getChildren()[this.getIndex() + 1] }
  get firstSibling(): Node | undefined { return this._parent?.getChildren()[0] }
  get lastSibling(): Node | undefined {
    const children = this._parent?.getChildren()
    return children ? children[children.length - 1] : undefined
  }

  constructor(properties?: Partial<NodeProperties>) {
    super()

    this
      .setProperties(properties)
      .on('enterTree', this._onEnterTree.bind(this))
      .on('exitTree', this._onExitTree.bind(this))
      .on('parented', this._onParented.bind(this))
      .on('unparented', this._onUnparented.bind(this))
      .on('ready', this._onReady.bind(this))
      .on('process', this._onProcess.bind(this))
  }

  /** Meta */
  protected _meta = new Map<string, unknown>()
  hasMeta(name: string): boolean { return this._meta.has(name) }
  getMeta<T = any>(name: string): T | undefined
  getMeta<T = any>(name: string, defaultVal: T): T
  getMeta(name: string, defaultVal?: any): any { return this._meta.get(name) ?? defaultVal }
  setMeta(name: string, value: any): void { this._meta.set(name, value) }
  deleteMeta(name: string): void { this._meta.delete(name) }
  clearMeta(): void { this._meta.clear() }

  /** Name */
  setName(value: string): this {
    this.name = value
    return this
  }

  /** Tree */
  getTree(): SceneTree | undefined { return this._tree }
  getViewport(): Viewport | undefined { return this._tree?.getCurrentViewport() }
  getWindow(): Viewport | undefined { return this._tree?.root }
  isInsideTree(): boolean { return Boolean(this._tree) }
  /** @internal */
  _setTree(tree: SceneTree | undefined): this {
    const oldTree = this._tree
    if (tree !== oldTree) {
      if (tree) {
        this._tree = tree
        this.emit('enterTree')
      }
      else if (oldTree) {
        this.emit('exitTree')
        this._tree = tree
      }

      for (let len = this._children.length, i = 0; i < len; i++) {
        const node = this._children[i]
        !tree && this.emit('childExitingTree', node)
        node._setTree(tree)
        tree && this.emit('childEnteredTree', node)
      }

      if (tree) {
        this.emit('postEnterTree')
        if (!this._readyed) {
          this._readyed = true
          this.emit('ready')
        }
      }
    }

    return this
  }

  isRenderable(): boolean {
    return (
      this.renderable !== false
      && (this.constructor as any).renderable
    )
    && this.isVisible()
  }

  isVisible(): boolean {
    return this._computedVisibility !== 'hidden'
  }

  protected _updateVisibility(): void {
    const parent = this._parent

    this._computedVisibleDelay = this.visibleDelay + (parent?._computedVisibleDelay ?? 0)
    if (parent?._computedVisibleDuration) {
      this._computedVisibleDuration = Math.min(this._computedVisibleDelay + this.visibleDuration, parent.visibleTimeline[1]) - this._computedVisibleDelay
    }
    else {
      this._computedVisibleDuration = this.visibleDuration
    }

    let visibility = this.visibility
      ?? parent?._computedVisibility
      ?? 'visible'

    const current = this._tree?.timeline.current ?? 0
    if (visibility !== 'hidden') {
      const [start, end] = this.visibleTimeline
      if (current < start || current > end) {
        visibility = 'hidden'
      }
    }

    this._computedVisibility = visibility
  }

  protected _onEnterTree(): void {
    this._enterTree()
    this.emit('treeEntered')
  }

  protected _onExitTree(): void {
    this.emit('treeExiting')
    this._exitTree()
    this.emit('treeExited')
  }

  protected _onParented(): void {
    this._parented()
  }

  protected _onUnparented(): void {
    this._unparented()
  }

  protected _onReady(): void {
    this._ready()
  }

  protected _onProcess(delta = 0): void {
    this._updateVisibility()
    const tree = this._tree
    tree?.emit('nodeProcessing', this)
    this._process(delta)

    const isRenderable = this.isRenderable()
    let oldRenderCall
    if (tree && isRenderable) {
      const renderCall = tree.renderStack.push(this)
      oldRenderCall = tree.renderStack.currentCall
      tree.renderStack.currentCall = renderCall
    }

    if (this.mask instanceof Node) {
      if (!this.getNode('__$mask')) {
        this.mask.renderable = false
        this.addChild(this.mask, InternalMode.FRONT)
      }
    }
    else {
      const mask = this.getNode('__$mask')
      if (mask) {
        this.removeChild(mask)
      }
    }

    for (let len = this._children.length, i = 0; i < len; i++) {
      this._children[i].emit('process', delta)
    }

    if (tree && isRenderable) {
      tree.renderStack.currentCall = oldRenderCall
    }
    tree?.emit('nodeProcessed', this)
  }

  render(renderer: WebGLRenderer, next?: () => void): void {
    const mask = this.mask

    if (mask) {
      renderer.flush()
      renderer.mask.push(this, mask)
    }

    this._render(renderer)

    next?.()

    if (mask) {
      renderer.flush()
      renderer.mask.pop(this)
    }
  }

  input(event: UIEvent): void {
    for (let i = this._children.length - 1; i >= 0; i--) {
      this._children[i].input(event)
    }
    this._input(event)
  }

  /** Parent */
  get parent(): Node | undefined { return this._parent }
  hasParent(): boolean { return !!this._parent }
  getParent(): Node | undefined { return this._parent }
  /** @internal */
  _setParent(parent: Node | undefined): this {
    if (!this._parent?.is(parent)) {
      this._parent = parent
      this._setTree(parent?._tree)
      this.emit(parent ? 'parented' : 'unparented')
    }
    return this
  }

  /** Children */
  getChildren(includeInternal: boolean | InternalMode = false): Node[] {
    switch (includeInternal) {
      case true:
        return this._children
      case false:
        return this._children.filter(child => child._internalMode === InternalMode.DEFAULT)
      default:
        return this._children.filter(child => child._internalMode === includeInternal)
    }
  }

  getIndex(includeInternal: boolean | InternalMode = false): number {
    return this._parent?.getChildren(includeInternal).indexOf(this) ?? 0
  }

  getNode<T extends Node>(path: string): T | undefined {
    return this._children.find(child => child.name === path) as T | undefined
  }

  removeNode(path: string): void {
    this.getNode(path)?.remove()
  }

  addSibling(sibling: Node): this {
    if (this.is(sibling) || !this.hasParent() || sibling.hasParent()) {
      return this
    }
    sibling._internalMode = this._internalMode
    this._parent!.moveChild(sibling, this.getIndex(true) + 1)
    return this
  }

  append(...nodes: Node[]): this {
    nodes.forEach((node) => {
      this.addChild(node)
    })
    return this
  }

  addChild(child: Node, internalMode = child._internalMode): this {
    if (this.is(child) || child.hasParent()) {
      return this
    }
    switch (internalMode) {
      case InternalMode.DEFAULT:
      case InternalMode.FRONT: {
        const targetMode = internalMode === InternalMode.DEFAULT
          ? InternalMode.BACK
          : InternalMode.FRONT
        const index = this._children.findIndex(child => child._internalMode === targetMode)
        if (index > -1) {
          this._children.splice(index, 0, child)
        }
        else {
          this._children.push(child)
        }
        break
      }
      case InternalMode.BACK:
        this._children.push(child)
        break
    }
    child._internalMode = internalMode
    child._setParent(this)
    this.emit('addChild', child)
    return this
  }

  moveChild(child: Node, toIndex: number, internalMode = child._internalMode): this {
    if (this.is(child) || (child.hasParent() && !this.is(child.parent))) {
      return this
    }
    child._internalMode = internalMode
    const oldIndex = this._children.indexOf(child)
    let minIndex = this._children.findIndex((_child) => {
      switch (internalMode) {
        case InternalMode.DEFAULT:
          return _child._internalMode !== InternalMode.FRONT
        case InternalMode.BACK:
          return _child._internalMode === InternalMode.BACK
        case InternalMode.FRONT:
        default:
          return true
      }
    })
    minIndex = minIndex > -1 ? minIndex : Math.max(0, this._children.length - 1)
    let maxIndex = this._children.slice(minIndex).findIndex((_child) => {
      switch (internalMode) {
        case InternalMode.FRONT:
          return _child._internalMode !== InternalMode.FRONT
        case InternalMode.DEFAULT:
          return _child._internalMode === InternalMode.BACK
        case InternalMode.BACK:
        default:
          return false
      }
    })
    maxIndex = maxIndex > -1 ? (minIndex + maxIndex) : Math.max(0, this._children.length - 1)
    const newIndex = clamp(minIndex, toIndex > -1 ? toIndex : maxIndex, maxIndex)
    if (newIndex !== oldIndex) {
      if (oldIndex > -1) {
        this._children.splice(oldIndex, 1)
      }
      child._setParent(this)
      if (newIndex > -1 && newIndex < this._children.length) {
        this._children.splice(newIndex, 0, child)
      }
      else {
        this._children.push(child)
      }
      if (oldIndex > -1) {
        this.emit('moveChild', child, newIndex, oldIndex)
      }
      else {
        this.emit('addChild', child)
      }
    }
    return this
  }

  removeChild(child: Node): this {
    const index = child.getIndex(true)
    if (this.is(child.parent) && index > -1) {
      this._children.splice(index, 1)
      child._setParent(undefined)
      this.emit('removeChild', child, index)
    }
    return this
  }

  removeChildren(): void {
    this.children.forEach(child => this.removeChild(child))
  }

  remove(): void {
    this._parent?.removeChild(this)
  }

  forEach(fn: (child: Node) => void): this {
    this.children.forEach(fn)
    return this
  }

  deepForEach(fn: (descendant: Node) => void): this {
    this.children.forEach((child) => {
      fn(child)
      child.deepForEach(fn)
    })
    return this
  }

  is(target: Node | undefined | null): boolean {
    return Boolean(target && this.instanceId === target.instanceId)
  }

  protected _enterTree(): void { /** override */ }
  protected _ready(): void { /** override */ }
  protected _exitTree(): void { /** override */ }
  protected _parented(): void { /** override */ }
  protected _unparented(): void { /** override */ }
  protected _process(_delta: number): void { /** override */ }
  protected _input(_event: UIEvent): void { /** override */ }
  protected _render(_renderer: WebGLRenderer): void { /** override */ }

  override toJSON(): Record<string, any> {
    return {
      tag: this.tag,
      props: super.toJSON(),
      children: this.children.map(child => child.toJSON()),
    }
  }

  static parse(JSON: Record<string, any>[]): Node[]
  static parse(JSON: Record<string, any>): Node
  static parse(JSON: any): any {
    if (Array.isArray(JSON)) {
      return JSON.map(val => this.parse(val))
    }
    const { tag, props, children } = JSON
    const NodeClass = (customNodes.get(tag) ?? Node) as any
    const node = new NodeClass(props) as Node
    children?.forEach((child: Record<string, any>) => node.addChild(this.parse(child)))
    return node
  }
}
