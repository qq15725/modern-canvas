export function parseCssTransformOrigin(transformOrigin: string): number[] {
  const [originX, originY = originX] = transformOrigin.split(' ')
  return [originX, originY].map((val) => {
    val = val.trim()
    switch (val) {
      case 'left':
      case 'top':
        return 0
      case 'center':
        return 0.5
      case 'right':
      case 'bottom':
        return 1
      default:
        return Number(val)
    }
  })
}
