export function getChanged(
  source: Record<string, any>,
  target: Record<string, any>,
): Record<string, boolean> {
  const keys = new Set([...Object.keys(source), ...Object.keys(target)])
  const changed: Record<string, boolean> = {}
  keys.forEach((key) => {
    changed[key] = source[key] !== target[key]
  })
  return changed
}
