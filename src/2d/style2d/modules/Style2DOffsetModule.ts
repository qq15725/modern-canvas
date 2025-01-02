import type { Style2D } from '../Style2D'
import { defineProperty } from '../../../core'
import { Style2DModule } from '../Style2DModule'

export interface Style2DOffsetProperties {
  offsetPath?: string
  offsetAnchor?: string | number
  offsetDistance?: string | number
  offsetPosition?: string | number
}

export interface Style2DOffsetExtend extends Style2DOffsetProperties {
  getComputedOffset: typeof getComputedOffset
}

declare module '../Style2D' {
  interface Style2DOptions extends Partial<Style2DOffsetProperties> {
    //
  }

  interface Style2D extends Style2DOffsetProperties {
    getComputedOffset: typeof getComputedOffset
  }
}

export class Style2DOffsetModule extends Style2DModule {
  install(Style2D: new () => Style2D): void {
    defineProperty(Style2D, 'offsetPath')
    defineProperty(Style2D, 'offsetAnchor')
    defineProperty(Style2D, 'offsetDistance')
    defineProperty(Style2D, 'offsetPosition')
    Style2D.prototype.getComputedOffset = getComputedOffset
  }
}

function getComputedOffset(this: Style2D): void {
  const offsetPath = this.offsetPath
  if (!offsetPath)
    return
  // const offsetAnchor = this.offsetAnchor // TODO
  // const offsetDistance = this.offsetDistance // TODO
  // const offsetPosition = this.offsetPosition // TODO
  if (offsetPath.startsWith('path')) {
    // TODO path("M 0,200 Q 200,200 260,80 Q 290,20 400,0 Q 300,100 400,200");
    const path = offsetPath.match(/path\(["'](.+)["']\)/)?.[1]
    if (!path)
      return
    path.split(' ').forEach((arg) => {
      switch (arg) {
        // moveTo
        case 'M':
        case 'm':
          break
        // lineTo
        case 'L':
        case 'l':
        case 'H':
        case 'h':
        case 'V':
        case 'v':
          break
        // Cubic Bézier Curve
        case 'C':
        case 'c':
        case 'S':
        case 's':
          break
        // Quadratic Bézier Curve
        case 'Q':
        case 'q':
        case 'T':
        case 't':
          break
        // Elliptical Arc Curve
        case 'A':
        case 'a':
          break
        // ClosePath
        case 'Z':
        case 'z':
          break
      }
    })
  }
  else if (offsetPath.startsWith('ray')) {
    // TODO ray(45deg closest-side contain); ray(contain 150deg at center center); ray(45deg);
  }
  else if (offsetPath.startsWith('url')) {
    // TODO url(#myCircle);
  }
  else if (offsetPath.startsWith('circle')) {
    // TODO circle(50% at 25% 25%);
  }
  else if (offsetPath.startsWith('ellipse')) {
    // TODO ellipse(50% 50% at 25% 25%);
  }
  else if (offsetPath.startsWith('insett')) {
    // TODO inset(50% 50% 50% 50%);
  }
  else if (offsetPath.startsWith('polygon')) {
    // TODO polygon(30% 0%, 70% 0%, 100% 50%, 30% 100%, 0% 70%, 0% 30%);
  }
  else if (offsetPath.startsWith('rect')) {
    // TODO rect(5px 5px 160px 145px round 20%);
  }
  else if (offsetPath.startsWith('xywh')) {
    // TODO xywh(0 5px 100% 75% round 15% 0);
  }
}
