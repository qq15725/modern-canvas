export function addProgramDefines(src: string, isES300: boolean, isFragment?: boolean): string {
  if (isES300)
    return src

  if (isFragment) {
    src = src.replace('out vec4 finalColor;', '')

    return `#ifdef GL_ES
  #define in varying
  #define finalColor gl_FragColor
  #define texture texture2D
#endif
${src}`
  }

  return `#ifdef GL_ES
  #define in attribute
  #define out varying
#endif
${src}`
}
