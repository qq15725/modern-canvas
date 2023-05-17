import type { App } from './app'
import type { Node } from './node'

export type QueryOptions = string | string[]

export function query(app: App, options?: QueryOptions): Node[] {
  const { nodeIdPathMap, components, children } = app

  if (!options) {
    return children.flatMap(function flatMap(node: Node): Node[] {
      return [node, node.children?.flatMap(flatMap)].filter(Boolean) as Node[]
    })
  }

  const names = typeof options === 'string' ? [options] : options
  const length = names.length

  const map = new Map()
  for (let i = 0; i < length; i++) {
    const result = components.get(names[i])
    if (!result) continue
    for (let len = result.length, i = 0; i < len; i++) {
      const key = result[i]
      map.set(key, (map.get(key) ?? 0) + 1)
    }
  }

  const ids = []
  for (const [key, value] of map.entries()) {
    if (value === length) ids.push(key)
  }

  const nodes = []
  for (let len = ids.length, i = 0; i < len; i++) {
    const path = nodeIdPathMap.get(ids[i])
    if (!path || !path.length) continue
    let node = children[path[0]]
    for (let len = path.length, i = 1; i < len; i++) {
      node = node[i]
    }
    nodes.push(node)
  }

  return nodes
}
