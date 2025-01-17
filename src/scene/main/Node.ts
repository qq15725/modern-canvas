import type {
  CoreObjectEventMap,
  EventListenerOptions,
  EventListenerValue,
  InputEvent,
  InputEventKey,
  InputEventMap,
  Maskable,
  WebGLRenderer,
} from '../../core'
import type { SceneTree } from './SceneTree'
import type { Viewport } from './Viewport'
import {
  clamp,
  CoreObject,
  customNode,
  customNodes, property,
} from '../../core'

export interface NodeEventMap extends CoreObjectEventMap, InputEventMap {
  treeEnter: (tree: SceneTree) => void
  treeEntered: (tree: SceneTree) => void
  treePostEnter: (tree: SceneTree) => void
  treeExit: (oldTree: SceneTree) => void
  treeExiting: (oldTree: SceneTree) => void
  treeExited: (oldTree: SceneTree) => void
  childExitingTree: (node: Node) => void
  childEnteredTree: (node: Node) => void
  ready: () => void
  parented: (parent: Node) => void
  unparented: (oldParent: Node) => void
  processing: (delta?: number) => void
  process: (delta?: number) => void
  processed: (delta?: number) => void
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

export type ProcessMode = 'inherit' | 'pausable' | 'when_paused' | 'always' | 'disabled'
export type RenderMode = 'inherit' | 'always' | 'disabled'
export type InternalMode = 'default' | 'front' | 'back'

export interface NodeProperties {
  name: string
  processMode: ProcessMode
  renderMode: RenderMode
  internalMode: InternalMode
  mask: Maskable
}

@customNode('Node')
export class Node extends CoreObject {
  readonly declare tag: string

  // @ts-expect-error tag
  @property() name = `${this.tag}:${String(this.instanceId)}`
  @property() mask?: Maskable
  @property({ default: 'inherit' }) declare processMode: ProcessMode
  @property({ default: 'inherit' }) declare renderMode: RenderMode
  @property({ default: 'default' }) declare internalMode: InternalMode

  protected _readyed = false

  constructor(properties?: Partial<NodeProperties>, children: Node[] = []) {
    super()

    this._onTreeEnter = this._onTreeEnter.bind(this)
    this._onTreeExit = this._onTreeExit.bind(this)
    this._onParented = this._onParented.bind(this)
    this._onUnparented = this._onUnparented.bind(this)
    this._onReady = this._onReady.bind(this)
    this._onProcess = this._onProcess.bind(this)

    this
      .setProperties(properties)
      .append(children)
      .on('treeEnter', this._onTreeEnter)
      .on('treeExit', this._onTreeExit)
      .on('parented', this._onParented)
      .on('unparented', this._onUnparented)
      .on('ready', this._onReady)
      .on('process', this._onProcess)
  }

  /** Name */
  getName(): string { return this.name }
  setName(value: string): this {
    this.name = value
    return this
  }

  /** Tree */
  protected _tree?: SceneTree
  get tree(): SceneTree | undefined { return this.getTree() }
  set tree(tree: SceneTree | undefined) { this.setTree(tree) }
  getTree(): SceneTree | undefined { return this._tree }
  getViewport(): Viewport | undefined { return this._tree?.getCurrentViewport() }
  getWindow(): Viewport | undefined { return this._tree?.root }
  isInsideTree(): boolean { return Boolean(this._tree) }
  setTree(tree: SceneTree | undefined): this {
    const oldTree = this._tree
    if (tree !== oldTree) {
      if (tree) {
        this._tree = tree
        this.emit('treeEnter', tree)
      }
      else if (oldTree) {
        this.emit('treeExit', oldTree)
        this._tree = tree
      }

      for (let len = this._children.length, i = 0; i < len; i++) {
        const node = this._children[i]
        !tree && this.emit('childExitingTree', node)
        node.setTree(tree)
        tree && this.emit('childEnteredTree', node)
      }

      if (tree) {
        this.emit('treePostEnter', tree)
        if (!this._readyed) {
          this._readyed = true
          this.emit('ready')
        }
      }
    }

    return this
  }

  /** Parent */
  protected _parent?: Node
  get parent(): Node | undefined { return this._parent }
  set parent(parent: Node | undefined) { this.setParent(parent) }
  hasParent(): boolean { return !!this._parent }
  getParent<T extends Node = Node>(): T | undefined { return this._parent as T }
  setParent<T extends Node = Node>(parent: T | undefined): this {
    if (!this._parent?.is(parent)) {
      const oldParent = this._parent
      this._parent = parent
      this.setTree(parent?._tree)
      if (parent) {
        this.emit('parented', parent)
      }
      else if (oldParent) {
        this.emit('unparented', oldParent)
      }
    }
    return this
  }

  /** Children */
  protected _children: Node[] = []
  get siblingIndex(): number { return this.getIndex() }
  set siblingIndex(toIndex) { this._parent?.moveChild(this, toIndex) }
  get previousSibling(): Node | undefined { return this._parent?.getChildren()[this.getIndex() - 1] }
  get nextSibling(): Node | undefined { return this._parent?.getChildren()[this.getIndex() + 1] }
  get firstSibling(): Node | undefined { return this._parent?.getChildren()[0] }
  get lastSibling(): Node | undefined {
    const children = this._parent?.getChildren()
    return children ? children[children.length - 1] : undefined
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

  canProcess(): boolean {
    if (!this._tree)
      return false
    switch (this.processMode) {
      case 'inherit':
        return this._parent?.canProcess() ?? true
      case 'pausable':
        return this._tree.paused
      case 'when_paused':
        return !this._tree.paused
      case 'always':
        return true
      case 'disabled':
      default:
        return false
    }
  }

  canRender(): boolean {
    if (!this._tree)
      return false
    switch (this.renderMode) {
      case 'inherit':
        return this._parent?.canRender() ?? true
      case 'always':
        return true
      case 'disabled':
      default:
        return false
    }
  }

  protected _onTreeEnter(tree: SceneTree): void {
    this._treeEnter(tree)
    this.emit('treeEntered', tree)
  }

  protected _onTreeExit(oldTree: SceneTree): void {
    this.emit('treeExiting', oldTree)
    this._treeExit(oldTree)
    this.emit('treeExited', oldTree)
  }

  protected _onParented(parent: Node): void {
    this._parented(parent)
  }

  protected _onUnparented(oldParent: Node): void {
    this._unparented(oldParent)
  }

  protected _onReady(): void {
    this._ready()
  }

  protected _onProcess(delta = 0): void {
    const tree = this._tree
    const canRender = this.canRender()
    const canProcess = this.canProcess()

    if (canProcess) {
      tree?.emit('nodeProcessing', this)
      this.emit('processing', delta)
      this._process(delta)
    }

    let oldRenderCall
    if (canRender) {
      const renderCall = tree!.renderStack.push(this)
      oldRenderCall = tree!.renderStack.currentCall
      tree!.renderStack.currentCall = renderCall
    }

    // mask
    if (this.mask instanceof Node) {
      if (!this.getNode('__$mask')) {
        this.mask.processMode = 'disabled'
        this.addChild(this.mask, 'front')
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

    if (canRender) {
      tree!.renderStack.currentCall = oldRenderCall
    }

    if (canProcess) {
      this.emit('processed', delta)
      tree?.emit('nodeProcessed', this)
    }
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

  input(event: InputEvent, key: InputEventKey): void {
    for (let i = this._children.length - 1; i >= 0; i--) {
      this._children[i].input(event, key)
    }
    this._input(event, key)
  }

  /** Children */
  getChildren(includeInternal: boolean | InternalMode = false): Node[] {
    switch (includeInternal) {
      case true:
        return this._children
      case false:
        return this._children.filter(child => child.internalMode === 'default')
      default:
        return this._children.filter(child => child.internalMode === includeInternal)
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
    sibling.internalMode = this.internalMode
    this._parent!.moveChild(sibling, this.getIndex(true) + 1)
    return this
  }

  append(children: Node[]): this
  append(...children: Node[]): this
  append(...children: any[]): this {
    let nodes
    if (Array.isArray(children[0])) {
      nodes = children[0]
    }
    else {
      nodes = children
    }
    nodes.forEach((node) => {
      this.addChild(node)
    })
    return this
  }

  addChild(child: Node, internalMode = child.internalMode): this {
    if (this.is(child) || child.hasParent()) {
      return this
    }
    switch (internalMode) {
      case 'default':
      case 'front': {
        const targetMode = internalMode === 'default'
          ? 'back'
          : 'front'
        const index = this._children.findIndex(child => child.internalMode === targetMode)
        if (index > -1) {
          this._children.splice(index, 0, child)
        }
        else {
          this._children.push(child)
        }
        break
      }
      case 'back':
        this._children.push(child)
        break
    }
    child.internalMode = internalMode
    child.setParent(this)
    this.emit('addChild', child)
    return this
  }

  moveChild(child: Node, toIndex: number, internalMode = child.internalMode): this {
    if (this.is(child) || (child.hasParent() && !this.is(child.parent))) {
      return this
    }
    child.internalMode = internalMode
    const oldIndex = this._children.indexOf(child)
    let minIndex = this._children.findIndex((_child) => {
      switch (internalMode) {
        case 'default':
          return _child.internalMode !== 'front'
        case 'back':
          return _child.internalMode === 'back'
        case 'front':
        default:
          return true
      }
    })
    minIndex = minIndex > -1 ? minIndex : Math.max(0, this._children.length - 1)
    let maxIndex = this._children.slice(minIndex).findIndex((_child) => {
      switch (internalMode) {
        case 'front':
          return _child.internalMode !== 'front'
        case 'default':
          return _child.internalMode === 'back'
        case 'back':
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
      child.setParent(this)
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
      child.setParent(undefined)
      this.emit('removeChild', child, index)
    }
    return this
  }

  removeChildren(): void {
    this.getChildren().forEach(child => this.removeChild(child))
  }

  remove(): void {
    this._parent?.removeChild(this)
  }

  forEach(fn: (child: Node) => void): this {
    this.getChildren().forEach(fn)
    return this
  }

  deepForEach(fn: (descendant: Node) => void): this {
    this.getChildren().forEach((child) => {
      fn(child)
      child.deepForEach(fn)
    })
    return this
  }

  is(target: Node | undefined | null): boolean {
    return Boolean(target && this.instanceId === target.instanceId)
  }

  /** override */
  protected _ready(): void {}
  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _treeEnter(tree: SceneTree): void {}
  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _treeExit(oldTree: SceneTree): void {}
  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _parented(parent: Node): void {}
  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _unparented(oldParent: Node): void {}
  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _process(delta: number): void {}
  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _input(event: InputEvent, key: InputEventKey): void {}
  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _render(renderer: WebGLRenderer): void {}

  override toJSON(): Record<string, any> {
    return {
      tag: this.tag,
      props: super.toJSON(),
      children: this.getChildren().map(child => child.toJSON()),
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
