import type { VertexFormat } from './const'

const attributeFormats = {
  uint8x2: { size: 2, stride: 2, normalized: false },
  uint8x4: { size: 4, stride: 4, normalized: false },
  sint8x2: { size: 2, stride: 2, normalized: false },
  sint8x4: { size: 4, stride: 4, normalized: false },
  unorm8x2: { size: 2, stride: 2, normalized: true },
  unorm8x4: { size: 4, stride: 4, normalized: true },
  snorm8x2: { size: 2, stride: 2, normalized: true },
  snorm8x4: { size: 4, stride: 4, normalized: true },
  uint16x2: { size: 2, stride: 4, normalized: false },
  uint16x4: { size: 4, stride: 8, normalized: false },
  sint16x2: { size: 2, stride: 4, normalized: false },
  sint16x4: { size: 4, stride: 8, normalized: false },
  unorm16x2: { size: 2, stride: 4, normalized: true },
  unorm16x4: { size: 4, stride: 8, normalized: true },
  snorm16x2: { size: 2, stride: 4, normalized: true },
  snorm16x4: { size: 4, stride: 8, normalized: true },
  float16x2: { size: 2, stride: 4, normalized: false },
  float16x4: { size: 4, stride: 8, normalized: false },
  float32: { size: 1, stride: 4, normalized: false },
  float32x2: { size: 2, stride: 8, normalized: false },
  float32x3: { size: 3, stride: 12, normalized: false },
  float32x4: { size: 4, stride: 16, normalized: false },
  uint32: { size: 1, stride: 4, normalized: false },
  uint32x2: { size: 2, stride: 8, normalized: false },
  uint32x3: { size: 3, stride: 12, normalized: false },
  uint32x4: { size: 4, stride: 16, normalized: false },
  sint32: { size: 1, stride: 4, normalized: false },
  sint32x2: { size: 2, stride: 8, normalized: false },
  sint32x3: { size: 3, stride: 12, normalized: false },
  sint32x4: { size: 4, stride: 16, normalized: false },
}

export function getAttributeInfoFromFormat(format: VertexFormat): { size: number, stride: number, normalized: boolean } {
  return attributeFormats[format] ?? attributeFormats.float32
}
