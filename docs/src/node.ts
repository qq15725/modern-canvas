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
  console.warn(engine.root.getChildren().map(v => v.name))
}

init()
