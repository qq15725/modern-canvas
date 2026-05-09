import { Element2D, Node } from '../../src'

async function init(): Promise<void> {
  const { Engine } = await import('../../src')
  const engine = new Engine({ autoStart: true, autoResize: true })
  ;(window as any).engine = engine
  document.body.append(engine.view!)

  const nodeA = engine.root.appendChild(Node.parse({
    is: 'Element2D',
    id: 'node-a',
    style: { left: 150, top: 200, width: 120, height: 80 },
    fill: { color: '#4A90D9FF' },
    outline: { color: '#1A5FA8FF', width: 2 },
    shape: {
      connectionPoints: [
        { idx: 0, x: 0.5, y: 0 },
        { idx: 1, x: 1,   y: 0.5 },
        { idx: 2, x: 0.5, y: 1 },
        { idx: 3, x: 0,   y: 0.5 },
      ],
    },
  }) as Element2D)

  const nodeB = engine.root.appendChild(Node.parse({
    is: 'Element2D',
    id: 'node-b',
    style: { left: 500, top: 400, width: 120, height: 80 },
    fill: { color: '#5CB85CFF' },
    outline: { color: '#3A7A3AFF', width: 2 },
    shape: {
      connectionPoints: [
        { idx: 0, x: 0.5, y: 0 },
        { idx: 1, x: 1,   y: 0.5 },
        { idx: 2, x: 0.5, y: 1 },
        { idx: 3, x: 0,   y: 0.5 },
      ],
    },
  }) as Element2D)

  // 连接线 1：A 右侧 → B 左侧
  engine.root.appendChild(Node.parse({
    is: 'Element2D',
    id: 'line-ab',
    fill: { color: '#FF6B35FF' },
    outline: { color: '#FF6B35FF', width: 3 },
    connection: { start: { id: 'node-a', idx: 1 }, end: { id: 'node-b', idx: 3 } },
  }))

  const nodeC = engine.root.appendChild(Node.parse({
    is: 'Element2D',
    id: 'node-c',
    style: { left: 500, top: 150, width: 100, height: 100, borderRadius: 50 },
    fill: { color: '#9B59B6FF' },
    outline: { color: '#6C3483FF', width: 2 },
  }) as Element2D)

  // 连接线 2：A 上侧 → C 中心（无 idx，fallback）
  engine.root.appendChild(Node.parse({
    is: 'Element2D',
    id: 'line-ac',
    fill: { color: '#E74C3CFF' },
    outline: { color: '#E74C3CFF', width: 2 },
    connection: { start: { id: 'node-a', idx: 0 }, end: { id: 'node-c' } },
  }))

  console.log('nodeMap size:', engine.nodeMap.size)
  console.log('node-a in map:', engine.nodeMap.get('node-a') === nodeA)
  console.log('node-b in map:', engine.nodeMap.get('node-b') === nodeB)
  console.log('node-c in map:', engine.nodeMap.get('node-c') === nodeC)

  let t = 0
  engine.on('process', (delta) => {
    t += delta * 0.001
    nodeB.style = {
      left: 500 + Math.cos(t) * 100,
      top:  400 + Math.sin(t) * 80,
      width: 120,
      height: 80,
    }
  })

  setTimeout(() => {
    const id = nodeC.id
    nodeC.remove()
    console.log('after remove node-c, still in map:', engine.nodeMap.has(id))
  }, 3000)
}

init()
