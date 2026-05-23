import { Element2D, Engine, Node } from '../../src'

// Visual hit-test bench: verifies pointer hits follow the *real* shape geometry,
// not the bounding box. White frames = each element's bbox (non-interactive
// reference); the yellow frame snaps to whatever shape the pointer actually hits.

interface ShapeDef {
  id: string
  x: number
  y: number
  w: number
  h: number
  shape?: any
  fill?: any
  outline?: any
}

// ---- shape geometry (normalized SVG) ----
const circle = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 50 A50 50 0 1 0 100 50 A50 50 0 1 0 0 50 Z"/></svg>'
// fill: none → only the stroke is hittable, the interior is not
const circleHollow = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="none" stroke="#000" d="M0 50 A50 50 0 1 0 100 50 A50 50 0 1 0 0 50 Z"/></svg>'
const triangle = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 0 L100 100 L0 100 Z"/></svg>'
const star = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2.5 -2.5 607.5 607.5"><path d="M 0 450 L 150 300 L 150 375 L 225 375 L 225 150 L 150 150 L 300 0 L 450 150 L 375 150 L 375 375 L 450 375 L 450 300 L 600 450 L 450 600 L 450 525 L 150 525 L 150 600 Z"/></svg>'
// outer ring + reversed inner ring → hole works under both evenodd and nonzero
const donut = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill-rule="evenodd" d="M0 50 A50 50 0 1 0 100 50 A50 50 0 1 0 0 50 Z M28 50 A22 22 0 1 1 72 50 A22 22 0 1 1 28 50 Z"/></svg>'

async function init(): Promise<void> {
  const engine = new Engine({ autoStart: true, autoResize: true })
  ;(window as any).engine = engine
  document.body.append(engine.view!)

  const shapes: ShapeDef[] = [
    { id: 'circle (fill)', x: 60, y: 80, w: 140, h: 140, shape: { svg: circle }, fill: { color: '#4A90D9FF' } },
    { id: 'triangle (fill)', x: 240, y: 80, w: 140, h: 140, shape: { svg: triangle }, fill: { color: '#5CB85CFF' } },
    { id: 'star (fill)', x: 420, y: 80, w: 140, h: 140, shape: { svg: star }, fill: { color: '#FF6B35FF' } },
    { id: 'donut (evenodd hole)', x: 60, y: 300, w: 140, h: 140, shape: { svg: donut }, fill: { color: '#9B59B6FF' } },
    { id: 'circle (outline only)', x: 240, y: 300, w: 140, h: 140, shape: { svg: circleHollow }, outline: { color: '#E74C3CFF', width: 8 } },
    { id: 'plain rect (no shape)', x: 420, y: 300, w: 160, h: 120, fill: { color: '#7F8C8DFF' } },
  ]

  // bbox lookup so the highlighter can snap to a hit shape's box
  const bbox: Record<string, { x: number, y: number, w: number, h: number }> = {}

  for (const s of shapes) {
    bbox[s.id] = { x: s.x, y: s.y, w: s.w, h: s.h }
    engine.root.appendChild(Node.parse({
      is: 'Element2D',
      id: s.id,
      style: { left: s.x, top: s.y, width: s.w, height: s.h },
      ...(s.shape ? { shape: s.shape } : {}),
      ...(s.fill ? { fill: s.fill } : {}),
      ...(s.outline ? { outline: s.outline } : {}),
    }) as Element2D)
    // bbox reference frame — non-interactive (pointerEvents: none)
    engine.root.appendChild(Node.parse({
      is: 'Element2D',
      style: { left: s.x, top: s.y, width: s.w, height: s.h, pointerEvents: 'none' },
      outline: { color: '#FFFFFF55', width: 1 },
    }) as Element2D)
  }

  // ---- connection row: only the line itself should hit, not its bbox ----
  const connectionPoints = [
    { idx: 0, x: 0.5, y: 0 },
    { idx: 1, x: 1, y: 0.5 },
    { idx: 2, x: 0.5, y: 1 },
    { idx: 3, x: 0, y: 0.5 },
  ]
  engine.root.appendChild(Node.parse({
    is: 'Element2D',
    id: 'node-A',
    style: { left: 60, top: 540, width: 120, height: 70 },
    fill: { color: '#EEEEEEFF' },
    outline: { color: '#AAAAAAFF', width: 1 },
    shape: { connectionPoints },
  }) as Element2D)
  engine.root.appendChild(Node.parse({
    is: 'Element2D',
    id: 'node-B',
    style: { left: 440, top: 670, width: 120, height: 70 },
    fill: { color: '#EEEEEEFF' },
    outline: { color: '#AAAAAAFF', width: 1 },
    shape: { connectionPoints },
  }) as Element2D)
  engine.root.appendChild(Node.parse({
    is: 'Element2D',
    id: 'line (orthogonal)',
    outline: { color: '#1ABC9CFF', width: 4 },
    connection: { start: { id: 'node-A', idx: 1 }, end: { id: 'node-B', idx: 3 }, mode: 'orthogonal' },
  }) as Element2D)

  // ---- yellow highlighter snapping to the hit shape's bbox ----
  const highlighter = engine.root.appendChild(Node.parse({
    is: 'Element2D',
    style: { left: -9999, top: -9999, width: 0, height: 0, pointerEvents: 'none' },
    outline: { color: '#FFFF00FF', width: 3 },
  }) as Element2D) as Element2D

  // ---- HUD ----
  const hud = document.createElement('div')
  hud.style.cssText = 'position:fixed;top:8px;right:8px;padding:10px 14px;background:#000C;color:#0f0;font:12px/1.6 monospace;white-space:pre;z-index:9999;border-radius:6px;pointer-events:none'
  document.body.append(hud)

  const help = document.createElement('div')
  help.style.cssText = 'position:fixed;bottom:8px;left:8px;padding:10px 14px;background:#000C;color:#ccc;font:12px/1.5 monospace;white-space:pre;z-index:9999;border-radius:6px;pointer-events:none'
  help.textContent = [
    '白框 = 元素包围盒(参考,不可点)   黄框 = 当前命中的形状',
    '验证点:',
    '· 圆/三角/星的「角落」(白框内、形状外)→ 不命中,黄框消失',
    '· 形状内部 → 命中,黄框套住',
    '· donut 中间的洞 → 不命中',
    '· 红色空心圆 → 只有描边附近命中,内部不命中',
    '· 灰色矩形(无 shape)→ 整个框都命中(回退矩形)',
    '· 青色连接线 → 只有线本身命中,折线包围盒空白处不命中',
  ].join('\n')
  document.body.append(help)

  const moveHighlighter = (id: string | undefined): void => {
    const b = id ? bbox[id] : undefined
    highlighter.style = b
      ? { left: b.x, top: b.y, width: b.w, height: b.h, pointerEvents: 'none' }
      : { left: -9999, top: -9999, width: 0, height: 0, pointerEvents: 'none' }
  }

  engine.on('pointermove', (e: any) => {
    const id: string | undefined = e.target?.id
    hud.textContent = `pointer: (${(e.screenX ?? 0).toFixed(0)}, ${(e.screenY ?? 0).toFixed(0)})\nhit:     ${id ?? '—'}`
    moveHighlighter(id)
  })
  engine.on('pointerdown', (e: any) => {
    ;(window as any).$$0 = e.target
    // eslint-disable-next-line no-console
    console.log('hit:', e.target?.id, e.target)
  })
}

init()
