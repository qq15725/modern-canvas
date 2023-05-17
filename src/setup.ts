import type { Node } from './node'
import type { App } from './app'

export function setup(app: App) {
  const { nodeIdPathMap, children, components } = app

  function setComponent(id: number, key: string) {
    let component = components.get(key)
    if (!component) {
      component = []
      components.set(key, component)
    }
    component.push(id)
  }

  function each(children: Node[], parentPath: number[]) {
    for (let len = children.length, i = 0; i < len; i++) {
      const node = children[i]
      const path = [...parentPath, i]
      node.id = node.id ?? ++app.nodeLastId
      nodeIdPathMap.set(node.id, path)
      for (const key in node) {
        setComponent(node.id, key)
      }
      node.children && each(node.children, path)
    }
  }

  each(children, [])
}
