const mimeTypeToExt = Object.entries({
  'font/woff': ['woff'],
  'font/ttf': ['ttf'],
  'font/otf': ['otf'],
  'image/gif': ['gif'],
  'image/jpeg': ['jpeg', 'jpg'],
  'image/png': ['png'],
  'image/tiff': ['tif', 'tiff'],
  'image/vnd.wap.wbmp': ['wbmp'],
  'image/x-icon': ['ico'],
  'image/x-jng': ['jng'],
  'image/x-ms-bmp': ['bmp'],
  'image/svg+xml': ['svg'],
  'image/webp': ['webp'],
  'application/json': ['json'],
})

function extToMimeType(ext: string): string | undefined {
  for (const [mimeType, exts] of mimeTypeToExt) {
    if (exts.includes(ext)) {
      return mimeType
    }
  }
  return undefined
}

export function parseMimeType(url: string): string | undefined {
  let mimeType: string | undefined
  if (url.startsWith('data:')) {
    mimeType = url.match(/^data:(.+?);/)?.[1]
  }
  else if (url.startsWith('http')) {
    const ext = url.split(/[#?]/)[0].split('.').pop()?.trim()
    if (ext)
      mimeType = extToMimeType(ext)
  }
  return mimeType
}
