import type { Canvas } from './canvas'

export interface Node {
  [key: string]: any
  x?: number
  y?: number
  width?: number
  height?: number
  children?: Node[]
}

export function forEachNode(canvas: Canvas, callbackFn: (node: Node, path: number[]) => void) {
  const { children } = canvas

  function forEachNodes(children: Node[], parentPath: number[] = []) {
    // for (let i = children.length - 1; i >= 0; i--) {
    for (let len = children.length, i = 0; i < len; i++) {
      const path = [...parentPath, i]
      const node = children[i]
      forEachNodes(node.children ?? [], path)
      callbackFn(node, path)
    }
  }

  forEachNodes(children)
}
