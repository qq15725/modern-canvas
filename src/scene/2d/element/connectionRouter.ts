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
  pts.push(...elbow(s1, sDir, e1, eDir))
  pts.push(e1, { x: e.x, y: e.y })
  return dedupe(pts)
}

/**
 * Orthogonal waypoints between the two stub points, given the outward
 * axis-aligned direction each stub continues along. Picks a route that never
 * doubles back over a stub, so the line stays clean even when an anchor faces
 * away from its target (the reverse-direction case).
 */
function elbow(
  q0: Vector2Like,
  d0: Vector2Like,
  q1: Vector2Like,
  d1: Vector2Like,
): Vector2Like[] {
  const sHorizontal = d0.y === 0
  const eHorizontal = d1.y === 0

  if (sHorizontal === eHorizontal) {
    // Same axis. A straight "Z" split through the midpoint only stays clean when
    // the stubs face each other with clearance ahead; otherwise split on the
    // cross axis, which can never double back over either stub.
    if (sHorizontal) {
      if (d0.x === -d1.x && (q1.x - q0.x) * d0.x > 0) {
        const midX = (q0.x + q1.x) / 2
        return [{ x: midX, y: q0.y }, { x: midX, y: q1.y }]
      }
      const midY = (q0.y + q1.y) / 2
      return [{ x: q0.x, y: midY }, { x: q1.x, y: midY }]
    }
    if (d0.y === -d1.y && (q1.y - q0.y) * d0.y > 0) {
      const midY = (q0.y + q1.y) / 2
      return [{ x: q0.x, y: midY }, { x: q1.x, y: midY }]
    }
    const midX = (q0.x + q1.x) / 2
    return [{ x: midX, y: q0.y }, { x: midX, y: q1.y }]
  }

  // Perpendicular axes: a single corner. Lead with the move along the horizontal
  // stub when that keeps both segments going forward (no reversal at either end);
  // otherwise lead with the vertical move, which is always valid.
  const [h, hDir, v, vDir] = sHorizontal
    ? [q0, d0, q1, d1]
    : [q1, d1, q0, d0]
  const horizontalFirst
    = (v.x - h.x) * hDir.x >= 0 && (v.y - h.y) * vDir.y <= 0
  return horizontalFirst
    ? [{ x: v.x, y: h.y }]
    : [{ x: h.x, y: v.y }]
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
