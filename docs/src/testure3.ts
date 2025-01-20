import { fonts } from 'modern-font'
import {
  Engine,
  Node,
  Timeline,
} from '../../src'

const engine = new Engine({
  autoStart: true,
  autoResize: true,
  backgroundColor: '#F6F7F9',
  timeline: Timeline.from([0, 5000], true),
})
document.body.append(engine.view!)

async function init(): Promise<void> {
  fonts.fallbackFont = await fonts.load({ family: 'fallbackFont', src: '/fonts/AaHouDiHei.woff' })

  const node1 = new Node()
  const node2 = new Node()
  const node3 = new Node()
  engine.root.addChild(node1)
  node1.addSibling(node2)
  node2.addSibling(node3)

  console.warn(engine.root.getChildren().map(v => v.name))
}

init()
