const fragmentNameCache: { [key: string]: number } = {}
const VertexNameCache: { [key: string]: number } = {}

export function setProgramName(
  src: string,
  { name = `program` }: { name: string },
  isFragment = true,
): string {
  name = name.replace(/\s+/g, '-')

  name += isFragment ? '-fragment' : '-vertex'

  const nameCache = isFragment ? fragmentNameCache : VertexNameCache

  if (nameCache[name]) {
    nameCache[name]++
    name += `-${nameCache[name]}`
  }
  else {
    nameCache[name] = 1
  }

  // if it already contains the define return
  if (src.includes('#define SHADER_NAME'))
    return src

  const shaderName = `#define SHADER_NAME ${name}`

  return `${shaderName}\n${src}`
}
