import type {
  CoreObjectEvents,
  GlRenderer,
  InputEvent,
  InputEventKey,
  InputEvents,
  MaskLike,
} from '../../core'
import type { SceneTree } from './SceneTree'
import type { Viewport } from './Viewport'
import type { Window } from './Window'
import { clearUndef, idGenerator, property } from 'modern-idoc'
import {
  CoreObject,
  customNode,
  customNodes,
} from '../../core'
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
  addChild: [child: Node, newIndex: number]
  removeChild: [child: Node, oldIndex: number]
}

export interface Node {
  on: <K extends keyof NodeEvents & string>(event: K, listener: (...args: NodeEvents[K]) => void) => this
  once: <K extends keyof NodeEvents & string>(event: K, listener: (...args: NodeEvents[K]) => void) => this
  off: <K extends keyof NodeEvents & string>(event: K, listener: (...args: NodeEvents[K]) => void) => this
  emit: <K extends keyof NodeEvents & string>(event: K, ...args: NodeEvents[K]) => this
}

export type ProcessMode = 'inherit' | 'pausable' | 'when-paused' | 'always' | 'disabled'
export type ProcessSortMode = 'default' | 'parent-before'
export type RenderMode = 'inherit' | 'always' | 'disabled'
export type InputMode = 'inherit' | 'always' | 'disabled'
export type InternalMode = 'default' | 'front' | 'back'

export interface NodeProperties {
  id: string
  name: string
  mask: MaskLike
  processMode: ProcessMode
  processSortMode: ProcessSortMode
  renderMode: RenderMode
  internalMode: InternalMode
  meta: Record<string, any>
}

export interface SerializedNode {
  [key: string]: any
  is?: string
  children?: SerializedNode[]
  meta?: {
    [key: string]: any
    inCanvasIs?: string
  }
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

  @property({ default: () => idGenerator() }) declare id: string
  @property({ default: () => idGenerator() }) declare name: string

  @property({ fallback: 'inherit' }) declare processMode: ProcessMode
  @property({ fallback: 'default' }) declare processSortMode: ProcessSortMode
  @property({ fallback: 'inherit' }) declare renderMode: RenderMode
  @property({ fallback: 'inherit' }) declare inputMode: InputMode
  @property({ fallback: 'default' }) declare internalMode: InternalMode
  @property({ internal: true }) declare mask?: MaskLike

  protected _meta = new Meta(this)
  get meta(): Meta { return this._meta }
  set meta(value: Record<string, any>) { this._meta.resetProperties().setProperties(value) }

  @property({ internal: true, default: true }) declare needsRender: boolean

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
      case 'when-paused':
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
        case 'parent-before':
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

  requestRender(): void {
    this.needsRender = true
  }

  protected override _updateProperty(key: string, newValue: any, oldValue: any): void {
    super._updateProperty(key, newValue, oldValue)

    switch (key) {
      case 'needsRender':
        if (newValue) {
          this._parent?.requestRender()
        }
        break
    }
  }

  render(renderer: GlRenderer, next?: () => void): void {
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
    if (this.equal(sibling) || !this.hasParent()) {
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

  append<T extends Node | SerializedNode>(nodes: T[]): void
  append<T extends Node | SerializedNode>(...nodes: T[]): void
  append(...nodes: any[]): void {
    let _nodes
    if (Array.isArray(nodes[0])) {
      _nodes = nodes[0]
    }
    else {
      _nodes = nodes
    }
    _nodes.forEach((node) => {
      if (node instanceof Node) {
        this.appendChild(node)
      }
      else {
        this.appendChild(Node.parse(node))
      }
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
    if (this.equal(node)) {
      return node
    }

    if (node.hasParent()) {
      node.remove()
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
    this.emit('addChild', node, node.getIndex())

    return node
  }

  moveChild(node: Node, toIndex: number, internalMode = node.internalMode): this {
    if (this.equal(node)) {
      return this
    }

    if (
      (node.hasParent() && !this.equal(node.parent))
      || node.internalMode !== internalMode
    ) {
      node.remove()
    }

    const children = this._children.getInternal(internalMode)
    const fromIndex = children.indexOf(node)
    toIndex = Math.max(0, toIndex)

    if (fromIndex !== toIndex) {
      if (fromIndex > -1) {
        children.splice(fromIndex, 1)
        toIndex = Math.max(0, toIndex - 1)
        this.emit('removeChild', node, fromIndex)
      }

      node.setParent(this)

      if (toIndex < children.length) {
        children.splice(toIndex, 0, node)
      }
      else {
        children.push(node)
      }

      this.emit('addChild', node, toIndex)
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

  findOne<T extends Node = Node>(callbackfn: (value: Node) => boolean): T | undefined {
    for (const child of this._children.default) {
      if (callbackfn(child)) {
        return child as T
      }
      const res = child.findOne<T>(callbackfn)
      if (res) {
        return res
      }
    }
    return undefined
  }

  findAll<T extends Node = Node>(callbackfn: (value: Node) => boolean): T[] {
    const items: Node[] = []
    for (const child of this._children.default) {
      if (callbackfn(child)) {
        items.push(child)
      }
      items.push(...child.findAll(callbackfn))
    }
    return items as T[]
  }

  findAncestor<T extends Node = Node>(callbackfn: (value: Node) => boolean): T | undefined {
    const parent = this._parent
    if (parent) {
      if (callbackfn(parent)) {
        return parent as T
      }
      const value = parent.findAncestor<T>(callbackfn)
      if (value) {
        return value
      }
    }
    return undefined
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
  protected _render(renderer: GlRenderer): void {
    this.needsRender = false
  }

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
      is: this.meta.inCanvasIs ? undefined : this.is,
      children: this.children.length
        ? [...this.children.map(child => child.toJSON())]
        : undefined,
      meta: this.meta.toJSON(),
    })
  }

  static parse(
    value: SerializedNode | SerializedNode[],
    defaultInCanvasIs: string = 'Node',
  ): any {
    if (Array.isArray(value)) {
      return value.map(val => this.parse(val))
    }
    const { is, meta = {}, children, ...props } = value
    const Class = (customNodes.get(is ?? meta.inCanvasIs ?? defaultInCanvasIs) ?? Node) as any
    const node = new Class({ ...props, meta }) as Node
    children?.forEach((child: Record<string, any>) => node.appendChild(this.parse(child)))
    return node
  }
}
