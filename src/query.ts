import { getArchetypeIdCodePoints } from './utils'
import type { App } from './app'
import type { Node } from './node'

export type QueryOptions = string | string[]

export function query(app: App, options?: QueryOptions): Node[] {
  const { entities, components, children, archetypes } = app

  if (!options) {
    return children.flatMap(function flatMap(node: Node): Node[] {
      return [node, node.children?.flatMap(flatMap)].filter(Boolean) as Node[]
    })
  }

  const componentNames = typeof options === 'string' ? [options] : options

  const componentIds = []
  for (let len = componentNames.length, i = 0; i < len; i++) {
    const componentId = components.get(componentNames[i])
    if (!componentId) continue
    componentIds.push(componentId)
  }
  const codePoints1 = getArchetypeIdCodePoints(componentIds)

  const nodes = []
  for (const [, { entityIds, codePoints }] of archetypes.entries()) {
    if (!codePoints.some(code1 => codePoints1.some(code2 => code2 & code1))) continue

    for (const [entityId] of entityIds.entries()) {
      const { path } = entities.get(entityId)!
      if (!path || !path.length) continue
      let node = children[path[0]]
      for (let len = path.length, i = 1; i < len; i++) {
        node = node[i]
      }
      nodes.push(node)
    }
  }

  return nodes
}
