import type { ConnectionMode } from 'modern-idoc'
import type { Vector2Like } from 'modern-path2d'
import { Path2D } from 'modern-path2d'

export type { ConnectionMode }

export interface ConnectionEndpoint {
  /** world-space anchor point */
  point: Vector2Like
  /** outward unit direction the line leaves the anchor by; undefined = auto-infer */
  dir?: Vector2Like
}

export interface ConnectionRouteOptions {
  /** perpendicular stub length the line leaves each anchor by (px) */
  stub?: number
}

/** Nearest axis-aligned unit vector for an arbitrary delta. */
export function axisDir(dx: number, dy: number): Vector2Like {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: Math.sign(dx) || 1, y: 0 }
  }
  return { x: 0, y: Math.sign(dy) || 1 }
}

/**
 * Build the world-space path that routes a connection from `start` to `end`
 * under the given mode.
 */
export function routeConnection(
  mode: ConnectionMode,
  start: ConnectionEndpoint,
  end: ConnectionEndpoint,
  options: ConnectionRouteOptions = {},
): Path2D {
  const s = start.point
  const e = end.point
  const path = new Path2D()

  switch (mode) {
    case 'curved': {
      const sDir = start.dir ?? axisDir(e.x - s.x, e.y - s.y)
      const eDir = end.dir ?? axisDir(s.x - e.x, s.y - e.y)
      const dist = Math.hypot(e.x - s.x, e.y - s.y)
      // control-point offset: enough to leave each anchor along its direction
      const k = Math.max((options.stub ?? 16) * 2, dist * 0.4)
      const c1x = s.x + sDir.x * k
      const c1y = s.y + sDir.y * k
      const c2x = e.x + eDir.x * k
      const c2y = e.y + eDir.y * k
      // Flatten the cubic into a polyline rather than emitting bezierCurveTo:
      // a stroked bezier leaves a small gap at the moveTo, while polyline strokes
      // (same path the straight/orthogonal modes use) sit flush against the anchor.
      const segments = 32
      for (let i = 0; i <= segments; i++) {
        const t = i / segments
        const mt = 1 - t
        const a = mt * mt * mt
        const b = 3 * mt * mt * t
        const c = 3 * mt * t * t
        const d = t * t * t
        const x = a * s.x + b * c1x + c * c2x + d * e.x
        const y = a * s.y + b * c1y + c * c2y + d * e.y
        if (i === 0) {
          path.moveTo(x, y)
        }
        else {
          path.lineTo(x, y)
        }
      }
      break
    }
    case 'orthogonal': {
      const pts = orthogonalPoints(start, end, options)
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) {
          path.moveTo(pts[i].x, pts[i].y)
        }
        else {
          path.lineTo(pts[i].x, pts[i].y)
        }
      }
      break
    }
    case 'straight':
    default:
      path.moveTo(s.x, s.y).lineTo(e.x, e.y)
      break
  }

  return path
}

function snapAxis(d: Vector2Like): Vector2Like {
  return axisDir(d.x, d.y)
}

/** Right-angle (elbow) waypoints from start to end. */
function orthogonalPoints(
  start: ConnectionEndpoint,
  end: ConnectionEndpoint,
  options: ConnectionRouteOptions,
): Vector2Like[] {
  const s = start.point
  const e = end.point
  const stub = options.stub ?? 16
  const sDir = snapAxis(start.dir ?? axisDir(e.x - s.x, e.y - s.y))
  const eDir = snapAxis(end.dir ?? axisDir(s.x - e.x, s.y - e.y))

  // leave each anchor perpendicular by a stub so the line departs/arrives cleanly
  const s1 = { x: s.x + sDir.x * stub, y: s.y + sDir.y * stub }
  const e1 = { x: e.x + eDir.x * stub, y: e.y + eDir.y * stub }

  const pts: Vector2Like[] = [{ x: s.x, y: s.y }, s1]
  const sHorizontal = sDir.y === 0
  const eHorizontal = eDir.y === 0

  if (sHorizontal && eHorizontal) {
    const midX = (s1.x + e1.x) / 2
    pts.push({ x: midX, y: s1.y }, { x: midX, y: e1.y })
  }
  else if (!sHorizontal && !eHorizontal) {
    const midY = (s1.y + e1.y) / 2
    pts.push({ x: s1.x, y: midY }, { x: e1.x, y: midY })
  }
  else if (sHorizontal) {
    pts.push({ x: e1.x, y: s1.y })
  }
  else {
    pts.push({ x: s1.x, y: e1.y })
  }

  pts.push(e1, { x: e.x, y: e.y })
  return dedupe(pts)
}

/** Drop consecutive duplicate points (zero-length segments). */
function dedupe(pts: Vector2Like[]): Vector2Like[] {
  const out: Vector2Like[] = []
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const prev = out[out.length - 1]
    if (!prev || Math.abs(prev.x - p.x) > 1e-3 || Math.abs(prev.y - p.y) > 1e-3) {
      out.push(p)
    }
  }
  return out
}
