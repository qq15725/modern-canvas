import { customNodes } from '../decorators'

export function createNode<T = any>(tag = 'node', options: Record<string, any> = {}): T {
  const Klass = customNodes.get(tag) as any
  if (!Klass) {
    throw new Error(`Failed to createNode, tag: ${tag}`)
  }
  return new Klass().setProperties(options)
}
