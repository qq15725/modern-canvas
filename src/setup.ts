import { getArchetypeIdCodePoints } from './utils'
import type { Node } from './node'
import type { App } from './app'

export function setup(app: App) {
  const { entities, children, components, archetypes } = app

  // reset
  entities.clear()
  components.clear()
  archetypes.clear()
  const genNodeId = (function () {
    let id = 0
    return () => ++id
  }())
  const genComponentId = (function () {
    let id = 0
    return () => ++id
  }())

  function setupNode(node: Node, path: number[]) {
    if (!node.id) node.id = genNodeId()
    const entityId = node.id
    // calc archetype id
    const componentIds = []
    for (const name in node) {
      let componentId = components.get(name)
      if (!componentId) {
        componentId = genComponentId()
        components.set(name, componentId)
      }
      componentIds.push(componentId)
    }
    const codePoints = getArchetypeIdCodePoints(componentIds)
    const archetypeId = codePoints.map(val => String.fromCharCode(val)).join('')
    // delete old entity id record
    const entity = entities.get(entityId)
    if (entity) archetypes.get(entity.archetypeId)?.entityIds?.delete(entityId)
    // add new entity id record
    const result = archetypes.get(archetypeId)
    let entityIds = result?.entityIds
    if (!result) {
      entityIds = new Set()
      archetypes.set(archetypeId, {
        entityIds,
        codePoints,
      })
    }
    entityIds!.add(entityId)
    entities.set(entityId, { path, archetypeId })
  }

  function each(children: Node[], parentPath: number[]) {
    for (let len = children.length, i = 0; i < len; i++) {
      const node = children[i]
      const path = [...parentPath, i]
      setupNode(node, path)
      node.children && each(node.children, path)
    }
  }

  each(children, [])
}
