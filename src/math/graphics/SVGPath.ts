import { Path2D } from './Path2D'
import { Point } from './Point'

const dSegmentRE = /([astvzqmhlc])([^astvzqmhlc]*)/gi
const dNumberRE = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi
const dLengthMap = { a: 7, c: 6, h: 1, l: 2, m: 2, q: 4, s: 4, t: 2, v: 1, z: 0 } as Record<string, number>

export type SVGPathDefineCommand =
  | 'a' | 's' | 't' | 'v' | 'z' | 'q' | 'g' | 'm' | 'h' | 'l' | 'c'
  | 'A' | 'S' | 'T' | 'V' | 'Z' | 'Q' | 'G' | 'M' | 'H' | 'L' | 'C'

export interface SVGPathDefine {
  command: SVGPathDefineCommand
  args: number[]
}

export type Path2DCallMethod =
  | 'moveTo' | 'lineTo' | 'bezierCurveTo' | 'quadraticCurveTo' | 'ellipticalArc' | 'closePath' |
  'rect' | 'roundRect' | 'circle' | 'ellipse' | 'arc' |
  'poly' | 'addPath' | 'arcTo' | 'regularPoly' | 'roundPoly' | 'roundShape' | 'filletRect' | 'chamferRect'

export interface Path2DCall {
  method: Path2DCallMethod
  args: any[]
}

interface SubPath {
  startX: number
  startY: number
}

export class SVGPath {
  defines: SVGPathDefine[] = []
  protected _calls: Path2DCall[] = []
  protected _dirty = false

  get path2D(): Path2D {
    const path2D = new Path2D()
    if (this._dirty) {
      this._dirty = false
      this._calls.forEach((call) => {
        (path2D as any)[call.method](...call.args)
      })
    }
    return path2D
  }

  constructor(d: string | SVGPath) {
    if (typeof d === 'string') {
      this.defines = this._parseDefines(d)
    }
    else {
      this.defines = d.defines.slice()
    }
    this.update()
  }

  protected _addCall(method: Path2DCallMethod, args: any[] = [], dirty = true): this {
    this._calls.push({ method, args })
    if (dirty) {
      this._dirty = true
    }
    return this
  }

  protected _parseDefines(d: string): SVGPathDefine[] {
    const defines: SVGPathDefine[] = []
    d.replace(dSegmentRE, (_: string, rawCommand: any, rawArgs: any) => {
      const args = rawArgs.match(dNumberRE)?.map(Number) ?? []
      let command = rawCommand.toLowerCase()
      if (command === 'm' && args.length > 2) {
        defines.push({ command: rawCommand, args: args.splice(0, 2) })
        command = 'l'
        rawCommand = rawCommand === 'm' ? 'l' : 'L'
      }

      while (true) {
        if (args.length === dLengthMap[command]) {
          defines.push({ command: rawCommand, args })
          return ''
        }
        if (args.length < dLengthMap[command])
          throw new Error('malformed path defines')
        defines.push({ command: rawCommand, args: args.splice(0, dLengthMap[command]) })
      }
    })
    return defines
  }

  update(): void {
    const subpaths: SubPath[] = []
    let currentSubPath: SubPath | null = null
    let lastX = 0
    let lastY = 0
    for (let i = 0; i < this.defines.length; i++) {
      const { command, args } = this.defines[i]
      switch (command) {
        case 'M':
          this._addCall('moveTo', [lastX = args[0], lastY = args[1]])
          break
        case 'm':
          this._addCall('moveTo', [lastX += args[0], lastY += args[1]])
          break
        case 'H':
          this._addCall('lineTo', [lastX = args[0], lastY])
          break
        case 'h':
          this._addCall('lineTo', [lastX += args[0], lastY])
          break
        case 'V':
          this._addCall('lineTo', [lastX, lastY = args[0]])
          break
        case 'v':
          this._addCall('lineTo', [lastX, lastY += args[0]])
          break
        case 'L':
          this._addCall('lineTo', [lastX = args[0], lastY = args[1]])
          break
        case 'l':
          this._addCall('lineTo', [lastX += args[0], lastY += args[1]])
          break
        case 'C':
          this._addCall('bezierCurveTo', [args[0], args[1], args[2], args[3], args[4], args[5]])
          lastX = args[4]
          lastY = args[5]
          break
        case 'c':
          this._addCall('bezierCurveTo', [
            lastX + args[0],
            lastY + args[1],
            lastX + args[2],
            lastY + args[3],
            lastX + args[4],
            lastY + args[5],
          ])
          lastX += args[4]
          lastY += args[5]
          break
        case 'Q':
          this._addCall('quadraticCurveTo', [args[0], args[1], args[2], args[3]])
          lastX = args[2]
          lastY = args[3]
          break
        case 'q':
          this._addCall('quadraticCurveTo', [
            lastX + args[0],
            lastY + args[1],
            lastX + args[2],
            lastY + args[3],
          ])
          lastX += args[2]
          lastY += args[3]
          break
        case 'S':
          this._smoothBezierCurveTo(args[0], args[1], args[2], args[3])
          lastX = args[2]
          lastY = args[3]
          break
        case 's':
          this._smoothBezierCurveTo(
            lastX + args[0],
            lastY + args[1],
            lastX + args[2],
            lastY + args[3],
          )
          lastX += args[2]
          lastY += args[3]
          break
        case 'T':
          this._smoothQuadraticCurveTo(lastX = args[0], lastY = args[1])
          break
        case 't':
          this._smoothQuadraticCurveTo(lastX += args[0], lastY += args[1])
          break
        case 'A':
          this._addCall('ellipticalArc', [args[0], args[1], args[2], args[3], args[4], args[5], args[6]])
          lastX = args[5]
          lastY = args[6]
          break
        case 'a':
          this._addCall('ellipticalArc', [args[0], args[1], args[2], args[3], args[4], args[5], args[6]])
          lastX += args[5]
          lastY += args[6]
          break
        case 'Z':
        case 'z':
          this._addCall('closePath')
          if (subpaths.length > 0) {
            currentSubPath = subpaths.pop()!
            if (currentSubPath) {
              lastX = currentSubPath.startX
              lastY = currentSubPath.startY
            }
            else {
              lastX = 0
              lastY = 0
            }
          }
          currentSubPath = null
          break
        default:
          console.warn(`Unknown SVG path command: ${command}`)
      }
      if (command !== 'Z' && command !== 'z') {
        if (currentSubPath === null) {
          currentSubPath = { startX: lastX, startY: lastY }
          subpaths.push(currentSubPath)
        }
      }
    }
  }

  protected _getLastPoint(out: Point): Point {
    let index = this._calls.length - 1
    let call = this._calls[index]
    if (!call) {
      out.x = 0
      out.y = 0
      return out
    }
    while (call.method === 'closePath') {
      index--
      if (index < 0) {
        out.x = 0
        out.y = 0
        return out
      }
      call = this._calls[index]
    }
    switch (call.method) {
      case 'moveTo':
      case 'lineTo':
        out.set(call.args[0], call.args[1])
        break
      case 'quadraticCurveTo':
        out.set(call.args[2], call.args[3])
        break
      case 'bezierCurveTo':
        out.set(call.args[4], call.args[5])
        break
      case 'arc':
      case 'ellipticalArc':
        out.set(call.args[5], call.args[6])
        break
      case 'addPath':
        // TODO prolly should transform the last point of the path
        call.args[0]._getLastPoint(out)
        break
    }
    return out
  }

  protected _smoothBezierCurveTo(cp2x: number, cp2y: number, x: number, y: number, smoothness?: number): this {
    const last = this._calls[this._calls.length - 1]
    const lastPoint = this._getLastPoint(Point.shared)
    let cp1x
    let cp1y
    if (!last || last.method !== 'bezierCurveTo') {
      cp1x = lastPoint.x
      cp1y = lastPoint.y
    }
    else {
      cp1x = last.args[2]
      cp1y = last.args[3]
      const currentX = lastPoint.x
      const currentY = lastPoint.y
      cp1x = currentX + (currentX - cp1x)
      cp1y = currentY + (currentY - cp1y)
    }
    this._addCall('bezierCurveTo', [cp1x, cp1y, cp2x, cp2y, x, y, smoothness])
    return this
  }

  protected _smoothQuadraticCurveTo(x: number, y: number, smoothness?: number): this {
    // check if we have a previous quadraticCurveTo
    const last = this._calls[this._calls.length - 1]
    const lastPoint = this._getLastPoint(Point.shared)
    let cpx1
    let cpy1
    if (!last || last.method !== 'quadraticCurveTo') {
      cpx1 = lastPoint.x
      cpy1 = lastPoint.y
    }
    else {
      cpx1 = last.args[0]
      cpy1 = last.args[1]
      const currentX = lastPoint.x
      const currentY = lastPoint.y
      cpx1 = currentX + (currentX - cpx1)
      cpy1 = currentY + (currentY - cpy1)
    }
    this._addCall('quadraticCurveTo', [cpx1, cpy1, x, y, smoothness])
    return this
  }
}
