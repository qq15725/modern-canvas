import {
  Engine,
  Node,
} from '../../src'

const engine = new Engine({
  autoStart: true,
  autoResize: true,
})

document.body.append(engine.view!)

async function init(): Promise<void> {
  const root = engine.root
  const node1 = new Node()
  const node2 = new Node()
  const node3 = new Node()
  const node4 = new Node()
  const node5 = new Node()
  const node6 = new Node()
  const node7 = new Node()
  const node8 = new Node()
  root.appendChild(node1)
  node1.addSibling(node2)
  node1.addSibling(node3)
  root.append(node4)
  root.insertBefore(node5, node4)
  node5.before(node6)
  node5.after(node7)
  root.prepend(node8)

  // ['Node:8', 'Node:1', 'Node:3', 'Node:2', 'Node:6', 'Node:5', 'Node:7', 'Node:4']
  console.warn(engine.root.children.map(v => v.name))

  root.on('removeChild', (...args) => console.warn('removeChild', ...args))
  root.on('addChild', (...args) => console.warn('addChild', ...args))

  // ['Node:1', 'Node:3', 'Node:2', 'Node:8', 'Node:6', 'Node:5', 'Node:7', 'Node:4']
  root.moveChild(node8, 3)
  console.warn(engine.root.children.map(v => v.name))

  // ['Node:1', 'Node:3', 'Node:2', 'Node:6', 'Node:8', 'Node:5', 'Node:7', 'Node:4']
  root.moveChild(node8, 4)
  console.warn(engine.root.children.map(v => v.name))

  // ['Node:1', 'Node:3', 'Node:2', 'Node:8', 'Node:6', 'Node:5', 'Node:7', 'Node:4']
  root.moveChild(node8, 3)
  console.warn(engine.root.children.map(v => v.name))

  // ['Node:8', 'Node:1', 'Node:3', 'Node:2', 'Node:6', 'Node:5', 'Node:7', 'Node:4']
  root.moveChild(node8, 0)
  console.warn(engine.root.children.map(v => v.name))
}

init()
