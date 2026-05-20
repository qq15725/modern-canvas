import type { ConnectionMode } from '../../src'
import { Element2D, Node } from '../../src'

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
    { mode: 'straight', color: '#4A90D9FF', y: 60 },
    { mode: 'orthogonal', color: '#FF6B35FF', y: 240 },
    { mode: 'curved', color: '#5CB85CFF', y: 420 },
  ]

  const movers: Element2D[] = []

  for (const { mode, color, y } of rows) {
    engine.root.appendChild(Node.parse({
      is: 'Element2D',
      id: `from-${mode}`,
      style: { left: 120, top: y, width: 130, height: 70 },
      fill: { color: '#EEEEEEFF' },
      outline: { color: '#AAAAAAFF', width: 1 },
      shape: { connectionPoints },
    }) as Element2D)

    const to = engine.root.appendChild(Node.parse({
      is: 'Element2D',
      id: `to-${mode}`,
      style: { left: 460, top: y + 40, width: 130, height: 70 },
      fill: { color: '#EEEEEEFF' },
      outline: { color: '#AAAAAAFF', width: 1 },
      shape: { connectionPoints },
    }) as Element2D)
    movers.push(to)

    // connection: source right anchor -> target left anchor, in this row's mode
    engine.root.appendChild(Node.parse({
      is: 'Element2D',
      id: `line-${mode}`,
      outline: { color, width: 3 },
      connection: { start: { id: `from-${mode}`, idx: 1 }, end: { id: `to-${mode}`, idx: 3 }, mode },
    }))
  }

  // eslint-disable-next-line no-console
  console.log('connection modes — blue: straight, orange: orthogonal, green: curved')

  // move the targets so the connectors re-route live
  let t = 0
  engine.on('process', (delta) => {
    t += delta * 0.001
    movers.forEach((to, i) => {
      to.style = {
        left: 460 + Math.cos(t + i) * 70,
        top: rows[i].y + 40 + Math.sin(t + i) * 60,
        width: 130,
        height: 70,
      }
    })
  })
}

init()
