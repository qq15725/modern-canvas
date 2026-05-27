import type { ConnectionMode, Element2D } from '../../src'
import { Node } from '../../src'

async function init(): Promise<void> {
  const { Engine } = await import('../../src')
  const engine = new Engine({ autoStart: true, autoResize: true })
  ;(window as any).engine = engine
  document.body.append(engine.view!)

  // four side connection points on every node
  const connectionPoints = [
    { idx: 0, x: 0.5, y: 0 }, // top
    { idx: 1, x: 1, y: 0.5 }, // right
    { idx: 2, x: 0.5, y: 1 }, // bottom
    { idx: 3, x: 0, y: 0.5 }, // left
  ]

  // one row per mode, identical geometry so the three render styles compare directly
  const rows: { mode: ConnectionMode, color: string, y: number }[] = [
    { mode: 'straight', color: '#4A90D9FF', y: 80 },
    { mode: 'orthogonal', color: '#FF6B35FF', y: 320 },
    { mode: 'curved', color: '#5CB85CFF', y: 560 },
  ]

  const movers: Element2D[] = []

  for (const { mode, color, y } of rows) {
    // connection: source right anchor -> target left anchor, in this row's mode.
    // appended BEFORE the two nodes so it sits lower in the render tree and the
    // boxes paint on top of the line instead of the line overlapping them.
    engine.root.appendChild(Node.parse({
      is: 'Element2D',
      id: `line-${mode}`,
      outline: { color, width: 3 },
      connection: { start: { id: `from-${mode}`, idx: 1 }, end: { id: `to-${mode}`, idx: 3 }, mode },
    }))

    // source sits centred; the target orbits all the way around it (below), so the
    // fixed right/left anchors sweep through forward (facing) AND reverse (facing
    // away) layouts — the reverse case is where orthogonal routing used to fold back.
    engine.root.appendChild(Node.parse({
      is: 'Element2D',
      id: `from-${mode}`,
      style: { left: 320, top: y, width: 130, height: 70 },
      fill: { color: '#EEEEEEFF' },
      outline: { color: '#AAAAAAFF', width: 1 },
      shape: { connectionPoints },
    }) as Element2D)

    const to = engine.root.appendChild(Node.parse({
      is: 'Element2D',
      id: `to-${mode}`,
      style: { left: 560, top: y, width: 130, height: 70 },
      fill: { color: '#EEEEEEFF' },
      outline: { color: '#AAAAAAFF', width: 1 },
      shape: { connectionPoints },
    }) as Element2D)
    movers.push(to)
  }

  // eslint-disable-next-line no-console
  console.log('connection modes — blue: straight, orange: orthogonal, green: curved')

  // orbit the targets fully around each (centred) source so the connectors
  // re-route live through both forward and reverse-direction layouts
  let t = 0
  engine.on('process', (delta) => {
    t += delta * 0.001
    movers.forEach((to, i) => {
      to.style = {
        left: 320 + Math.cos(t + i) * 240,
        top: rows[i].y + Math.sin(t + i) * 60,
        width: 130,
        height: 70,
      }
    })
  })
}

init()
