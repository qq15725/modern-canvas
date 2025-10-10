import type {
  CoreObjectEvents,
  InputEvent,
  InputEventKey,
  InputEvents,
  Maskable,
  WebGLRenderer,
} from '../../core'
import type { SceneTree } from './SceneTree'
import type { Viewport } from './Viewport'
import type { Window } from './Window'
import { clearUndef, idGenerator, property } from 'modern-idoc'
import { CoreObject, customNode, customNodes } from '../../core'
import { Children } from './Children'
import { Meta } from './Meta'

export interface NodeEvents extends CoreObjectEvents, InputEvents {
  treeEnter: [tree: SceneTree]
  treeEntered: [tree: SceneTree]
  treePostEnter: [tree: SceneTree]
  treeExit: [oldTree: SceneTree]
  treeExiting: [oldTree: SceneTree]
  treeExited: [oldTree: SceneTree]
  childExitingTree: [node: Node]
  childEnteredTree: [node: Node]
  ready: []
  parented: [parent: Node]
  unparented: [oldParent: Node]
  processing: [delta?: number]
  process: [delta?: number]
  processed: [delta?: number]
  appendChild: [child: Node]
  removeChild: [child: Node, index: number]
  moveChild: [child: Node, newIndex: number, oldIndex: number]
}

export interface Node {
  on: <K extends keyof NodeEvents & string>(event: K, listener: (...args: NodeEvents[K]) => void) => this
  once: <K extends keyof NodeEvents & string>(event: K, listener: (...args: NodeEvents[K]) => void) => this
  off: <K extends keyof NodeEvents & string>(event: K, listener: (...args: NodeEvents[K]) => void) => this
  emit: <K extends keyof NodeEvents & string>(event: K, ...args: NodeEvents[K]) => this
}

export type ProcessMode = 'inherit' | 'pausable' | 'when_paused' | 'always' | 'disabled'
export type ProcessSortMode = 'default' | 'parent_before'
export type RenderMode = 'inherit' | 'always' | 'disabled'
export type InputMode = 'inherit' | 'always' | 'disabled'
export type InternalMode = 'default' | 'front' | 'back'

export interface NodeProperties {
  id: string
  name: string
  mask: Maskable
  processMode: ProcessMode
  processSortMode: ProcessSortMode
  renderMode: RenderMode
  internalMode: InternalMode
  meta: Record<string, any>
}

const iidMap: Record<string, number> = {}

function getNodeIid(key: any): number {
  let iid = iidMap[key] ?? 0
  iid++
  iidMap[key] = iid
  return iid
}

@customNode('Node')
export class Node extends CoreObject {
  readonly declare is: string

  @property({ fallback: idGenerator() }) declare id: string
  @property({ fallback: idGenerator() }) declare name: string

  @property({ internal: true, fallback: 'inherit' }) declare processMode: ProcessMode
  @property({ internal: true, fallback: 'default' }) declare processSortMode: ProcessSortMode
  @property({ internal: true, fallback: 'inherit' }) declare renderMode: RenderMode
  @property({ internal: true, fallback: 'inherit' }) declare inputMode: InputMode
  @property({ internal: true, fallback: 'default' }) declare internalMode: InternalMode
  @property({ internal: true }) declare mask?: Maskable

  protected _meta = new Meta(this)
  get meta(): Meta { return this._meta }
  set meta(value: Record<string, any>) { this._meta.resetProperties().setProperties(value) }

  protected _readyed = false

  constructor(properties?: Partial<NodeProperties>, nodes: Node[] = []) {
    super()

    this._onTreeEnter = this._onTreeEnter.bind(this)
    this._onTreeExit = this._onTreeExit.bind(this)
    this._onParented = this._onParented.bind(this)
    this._onUnparented = this._onUnparented.bind(this)
    this._onReady = this._onReady.bind(this)
    this._onProcess = this._onProcess.bind(this)

    this
      .setProperties({
        name: `${this.is}:${getNodeIid(this.is)}`,
        ...properties,
      })
      .append(nodes)

    this.on('treeEnter', this._onTreeEnter)
      .on('treeExit', this._onTreeExit)
      .on('parented', this._onParented)
      .on('unparented', this._onUnparented)
      .on('ready', this._onReady)
      .on('process', this._onProcess)
  }

  override setProperties(properties?: Record<string, any>): this {
    if (properties) {
      const {
        meta,
        ...restProperties
      } = properties

      if (meta) {
        this.meta = meta
      }

      super.setProperties(restProperties)
    }
    return this
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
  getViewport(): Viewport | undefined { return this.parent?.getViewport() ?? this.getWindow() }
  getWindow(): Window | undefined { return this._tree?.root }
  isInsideTree(): boolean { return Boolean(this._tree) }
  setTree(tree: SceneTree | undefined): this {
    const oldTree = this._tree
    if (!tree?.equal(oldTree)) {
      if (oldTree) {
        this.emit('treeExit', oldTree)
      }

      this._tree = tree

      if (tree) {
        this.emit('treeEnter', tree)
      }

      const children = this._children.internal
      for (let len = children.length, i = 0; i < len; i++) {
        const node = children[i]
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

  log(...args: any[]): void {
    this._tree?.log(...args)
  }

  /** Parent */
  protected _parent?: Node
  get parent(): Node | undefined { return this._parent }
  set parent(parent: Node | undefined) { this.setParent(parent) }
  hasParent(): boolean { return Boolean(this._parent) }
  getParent<T extends Node = Node>(): T | undefined { return this._parent as T }
  setParent<T extends Node = Node>(parent: T | undefined): this {
    if (!this._parent?.equal(parent)) {
      const oldParent = this._parent
      if (oldParent) {
        this.emit('unparented', oldParent)
      }
      this._parent = parent
      if (parent) {
        this.emit('parented', parent)
      }
      this.setTree(parent?._tree)
    }
    return this
  }

  /** Children */
  protected _children = new Children()
  get children(): Node[] { return this._children.default }
  set children(value: Node[]) { this._children.set(value) }
  getChildren(internalMode: InternalMode | true = 'default'): Node[] { return this._children.getInternal(internalMode === true ? undefined : internalMode) }
  getChild<T extends Node = Node>(index = 0): T | undefined { return this.children[index] as T }
  get siblingIndex(): number { return this.getIndex() }
  set siblingIndex(toIndex) { this._parent?.moveChild(this, toIndex) }
  get previousSibling(): Node | undefined { return this._parent?.children[this.getIndex() - 1] }
  get nextSibling(): Node | undefined { return this._parent?.children[this.getIndex() + 1] }
  get firstSibling(): Node | undefined { return this._parent?.children[0] }
  get lastSibling(): Node | undefined {
    const children = this._parent?.children
    return children ? children[children.length - 1] : undefined
  }

  canProcess(): boolean {
    if (!this._tree)
      return false
    switch (this.processMode) {
      case 'inherit':
        return this._parent?.canProcess() ?? true
      case 'pausable':
        return !this._tree.processPaused
      case 'when_paused':
        return this._tree.processPaused
      case 'always':
        return true
      case 'disabled':
      default:
        return false
    }
  }

  canInput(): boolean {
    if (!this._tree)
      return false
    switch (this.inputMode) {
      case 'inherit':
        return this._parent?.canInput() ?? true
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

    const childrenInBefore: Node[] = []
    const childrenInAfter: Node[] = []
    this._children.internal.forEach((child) => {
      switch (child.processSortMode) {
        case 'default':
          childrenInAfter.push(child)
          break
        case 'parent_before':
          childrenInBefore.push(child)
          break
      }
    })

    childrenInBefore.forEach((child) => {
      child.emit('process', delta)
    })

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
        this.appendChild(this.mask, 'front')
      }
    }
    else {
      const mask = this.getNode('__$mask')
      if (mask) {
        this.removeChild(mask)
      }
    }

    childrenInAfter.forEach((child) => {
      child.emit('process', delta)
    })

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
    if (event.propagationStopped) {
      return
    }

    const array = this._children.internal
    for (let i = array.length - 1; i >= 0; i--) {
      array[i].input(event, key)
    }

    if (event.propagationStopped) {
      return
    }

    if (this.canInput()) {
      this._input(event, key)
    }
  }

  getIndex(): number {
    return this._parent?.getChildren(this.internalMode).indexOf(this) ?? 0
  }

  getNode<T extends Node>(path: string): T | undefined {
    return this._children.internal.find(child => child.name === path) as T | undefined
  }

  removeNode(path: string): void {
    this.getNode(path)?.remove()
  }

  addSibling(sibling: Node): this {
    if (this.equal(sibling) || !this.hasParent() || sibling.hasParent()) {
      return this
    }
    sibling.internalMode = this.internalMode
    this._parent!.moveChild(sibling, this.getIndex() + 1)
    return this
  }

  prepend<T extends Node>(nodes: T[]): void
  prepend<T extends Node>(...nodes: T[]): void
  prepend(...nodes: any[]): void {
    let _nodes
    if (Array.isArray(nodes[0])) {
      _nodes = nodes[0]
    }
    else {
      _nodes = nodes
    }
    _nodes.forEach((node) => {
      this.moveChild(node, 0)
    })
  }

  append<T extends Node>(nodes: T[]): void
  append<T extends Node>(...nodes: T[]): void
  append(...nodes: any[]): void {
    let _nodes
    if (Array.isArray(nodes[0])) {
      _nodes = nodes[0]
    }
    else {
      _nodes = nodes
    }
    _nodes.forEach((node) => {
      this.appendChild(node)
    })
  }

  before<T extends Node>(nodes: T[]): void
  before<T extends Node>(...nodes: T[]): void
  before(...nodes: any[]): void {
    let _nodes
    if (Array.isArray(nodes[0])) {
      _nodes = nodes[0]
    }
    else {
      _nodes = nodes
    }
    _nodes.forEach((node) => {
      this._parent?.moveChild(node, this.getIndex())
    })
  }

  after<T extends Node>(nodes: T[]): void
  after<T extends Node>(...nodes: T[]): void
  after(...nodes: any[]): void {
    let _nodes
    if (Array.isArray(nodes[0])) {
      _nodes = nodes[0]
    }
    else {
      _nodes = nodes
    }
    _nodes.forEach((node) => {
      this._parent?.moveChild(node, this.getIndex() + 1)
    })
  }

  insertBefore<T extends Node>(node: T, child: Node): T {
    if (!child.hasParent() || !this.equal(child.parent)) {
      return node
    }
    this.moveChild(node, child.getIndex())
    return node
  }

  appendChild<T extends Node>(node: T, internalMode = node.internalMode): T {
    if (this.equal(node) || node.hasParent()) {
      return node
    }
    switch (internalMode) {
      case 'front':
        this._children.front.push(node)
        break
      case 'default':
        this._children.default.push(node)
        break
      case 'back':
        this._children.back.push(node)
        break
    }
    if (node.internalMode !== internalMode) {
      node.internalMode = internalMode
    }
    node.setParent(this)
    this.emit('appendChild', node)
    return node
  }

  moveChild(node: Node, toIndex: number, internalMode = node.internalMode): this {
    if (this.equal(node) || (node.hasParent() && !this.equal(node.parent))) {
      return this
    }

    const fromArray = this._children.getInternal(node.internalMode)
    const fromIndex = fromArray.indexOf(node)
    const toArray = this._children.getInternal(internalMode)

    if (node.internalMode !== internalMode || toIndex !== fromIndex) {
      if (fromIndex > -1) {
        fromArray.splice(fromIndex, 1)
      }

      node.setParent(this)

      if (toIndex > -1 && toIndex < toArray.length) {
        toArray.splice(toIndex, 0, node)
      }
      else {
        toArray.push(node)
      }

      if (fromIndex > -1) {
        this.emit('moveChild', node, toIndex, fromIndex)
      }
      else {
        this.emit('appendChild', node)
      }
    }

    if (node.internalMode !== internalMode) {
      node.internalMode = internalMode
    }

    return this
  }

  removeChild<T extends Node>(child: T): T {
    const index = child.getIndex()
    if (this.equal(child.parent) && index > -1) {
      this.getChildren(child.internalMode).splice(index, 1)
      child.setParent(undefined)
      this.emit('removeChild', child, index)
    }
    return child
  }

  removeChildren(): void {
    this.children.forEach(child => this.removeChild(child))
  }

  remove(): void {
    this._parent?.removeChild(this)
  }

  forEachChild(callbackfn: (value: Node, index: number, array: Node[]) => void): this {
    this.children.forEach(callbackfn)
    return this
  }

  forEachDescendant(callbackfn: (descendant: Node) => void): this {
    this.children.forEach((child) => {
      callbackfn(child)
      child.forEachDescendant(callbackfn)
    })
    return this
  }

  forEachAncestor(callbackfn: (ancestor: Node) => void): this {
    const parent = this.parent
    if (parent) {
      callbackfn(parent)
      parent.forEachAncestor(callbackfn)
    }
    return this
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

  override destroy(): void {
    super.destroy()
    this._children.internal.forEach(node => this.removeChild(node))
  }

  clone(): this {
    return new (this.constructor as any)(
      this.toJSON(),
      this._children.internal,
    )
  }

  override toJSON(): Record<string, any> {
    return clearUndef({
      ...super.toJSON(),
      children: this.children.length
        ? [...this.children.map(child => child.toJSON())]
        : undefined,
      meta: {
        ...this.meta.toJSON(),
        inCanvasIs: this.is,
      },
    })
  }

  static parse(value: any): any {
    if (Array.isArray(value)) {
      return value.map(val => this.parse(val))
    }
    const { meta = {}, children, ...props } = value
    const { inCanvasIs = 'Node' } = meta
    const Class = (customNodes.get(inCanvasIs) ?? Node) as any
    const node = new Class({ ...props, meta }) as Node
    children?.forEach((child: Record<string, any>) => node.appendChild(this.parse(child)))
    return node
  }
}
