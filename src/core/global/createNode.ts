import type { Node } from '../Node'
import { customNodes } from '../decorators'

export function createNode<T extends Node>(tag = 'node', options: Record<string, any> = {}): T {
  const Klass = customNodes.get(tag) as any
  if (!Klass) {
    throw new Error(`Failed to createNode, tag: ${tag}`)
  }
  return new Klass().setProperties(options)
}
