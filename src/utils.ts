export class Matrix3 extends Float32Array {
  public static identity() {
    return new Matrix3([
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ])
  }

  public static translation(tx: number, ty: number) {
    return new Matrix3([
      1, 0, 0,
      0, 1, 0,
      tx, ty, 1,
    ])
  }

  public static rotation(radians: number) {
    const c = Math.cos(radians)
    const s = Math.sin(radians)
    return new Matrix3([
      c, -s, 0,
      s, c, 0,
      0, 0, 1,
    ])
  }

  public static scaling(sx: number, sy: number) {
    return new Matrix3([
      sx, 0, 0,
      0, sy, 0,
      0, 0, 1,
    ])
  }

  public multiply(matrix3: Matrix3) {
    const a00 = this[0]
    const a01 = this[1]
    const a02 = this[2]
    const a10 = this[3]
    const a11 = this[4]
    const a12 = this[5]
    const a20 = this[6]
    const a21 = this[7]
    const a22 = this[8]
    const b00 = matrix3[0]
    const b01 = matrix3[1]
    const b02 = matrix3[2]
    const b10 = matrix3[3]
    const b11 = matrix3[4]
    const b12 = matrix3[5]
    const b20 = matrix3[6]
    const b21 = matrix3[7]
    const b22 = matrix3[8]
    this[0] = b00 * a00 + b01 * a10 + b02 * a20
    this[1] = b00 * a01 + b01 * a11 + b02 * a21
    this[2] = b00 * a02 + b01 * a12 + b02 * a22
    this[3] = b10 * a00 + b11 * a10 + b12 * a20
    this[4] = b10 * a01 + b11 * a11 + b12 * a21
    this[5] = b10 * a02 + b11 * a12 + b12 * a22
    this[6] = b20 * a00 + b21 * a10 + b22 * a20
    this[7] = b20 * a01 + b21 * a11 + b22 * a21
    this[8] = b20 * a02 + b21 * a12 + b22 * a22
    return this
  }
}

export function getArchetypeIdCodePoints(componentIds: number[]): number[] {
  const codePoints = []
  for (let len = componentIds.length, i = 0; i < len; i++) {
    const componentId = componentIds[i]
    const index = ~~(componentId / 16)
    for (let ix = 0; ix <= index; ix++) {
      if (!(ix in codePoints)) codePoints[ix] = 0
    }
    codePoints[index] |= 1 << (componentId % 16)
  }
  return codePoints
}

export function createVideo(url: string): HTMLVideoElement {
  const video = document.createElement('video')
  video.playsInline = true
  video.muted = true
  video.loop = true
  video.src = url
  return video
}

export function createImage(url: string): HTMLImageElement {
  const img = new Image()
  img.decoding = 'sync'
  img.loading = 'eager'
  img.crossOrigin = 'anonymous'
  img.src = url
  return img
}

// TODO 需要释放
let sandbox: HTMLIFrameElement | undefined
const colors = new Map<string, [number, number, number, number]>()
function getCurrentSandbox() {
  if (!sandbox) {
    sandbox = document.createElement('iframe')
    sandbox.id = `__SANDBOX__${ Math.random() }`
    sandbox.width = '0'
    sandbox.height = '0'
    sandbox.style.visibility = 'hidden'
    sandbox.style.position = 'fixed'
    document.body.appendChild(sandbox)
    sandbox.contentWindow?.document.write('<!DOCTYPE html><meta charset="UTF-8"><title></title><body>')
  }
  return sandbox
}

function decodeColor(color: string): number[] | void {
  switch (true) {
    case color.startsWith('#') && color.length === 7:
      color = color.substring(1)
      return [
        parseInt(`${ color[0] }${ color[1] }`, 16) / 255,
        parseInt(`${ color[2] }${ color[3] }`, 16) / 255,
        parseInt(`${ color[4] }${ color[5] }`, 16) / 255,
        1,
      ]
    case color.startsWith('#') && color.length === 9:
      color = color.substring(1)
      return [
        parseInt(`${ color[0] }${ color[1] }`, 16) / 255,
        parseInt(`${ color[2] }${ color[3] }`, 16) / 255,
        parseInt(`${ color[4] }${ color[5] }`, 16) / 255,
        parseInt(`${ color[6] }${ color[7] }`, 16) / 255,
      ]
    case color.startsWith('rgb('):
      return [
        ...color.replace(/rgb\((.+?)\)/, '$1')
          .split(',')
          .slice(0, 3)
          .map(val => Number(val.trim()) / 255),
        1,
      ]
    case color.startsWith('rgba('):
      return color.replace(/rgba\((.+?)\)/, '$1')
        .split(',')
        .slice(0, 4)
        .map(val => Number(val.trim()) / 255)
  }
}

export function resolveColor(value: string, defaultValue = [0, 0, 0, 0]): [number, number, number, number] {
  if (colors.has(value)) return colors.get(value)!

  let color = decodeColor(value)

  if (!color) {
    const sandbox = getCurrentSandbox()
    if (sandbox) {
      const sandboxWindow = sandbox.contentWindow
      if (sandboxWindow) {
        const sandboxDocument = sandboxWindow.document
        const el = sandboxDocument.createElement('div')
        sandboxDocument.body.appendChild(el)
        el.textContent = ' '
        el.style.color = value
        color = decodeColor(sandboxWindow.getComputedStyle(el).color)
        sandboxDocument.body.removeChild(el)
      }
    }
  }

  if (color) colors.set(value, color as any)

  return (color ?? defaultValue) as any
}
