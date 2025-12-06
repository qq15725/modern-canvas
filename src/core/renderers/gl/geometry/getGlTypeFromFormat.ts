import type { VertexFormat } from '../../shared'
import { GlType } from '../texture'

const infoMap = {
  uint8x2: GlType.UNSIGNED_BYTE,
  uint8x4: GlType.UNSIGNED_BYTE,
  sint8x2: GlType.BYTE,
  sint8x4: GlType.BYTE,
  unorm8x2: GlType.UNSIGNED_BYTE,
  unorm8x4: GlType.UNSIGNED_BYTE,
  snorm8x2: GlType.BYTE,
  snorm8x4: GlType.BYTE,
  uint16x2: GlType.UNSIGNED_SHORT,
  uint16x4: GlType.UNSIGNED_SHORT,
  sint16x2: GlType.SHORT,
  sint16x4: GlType.SHORT,
  unorm16x2: GlType.UNSIGNED_SHORT,
  unorm16x4: GlType.UNSIGNED_SHORT,
  snorm16x2: GlType.SHORT,
  snorm16x4: GlType.SHORT,
  float16x2: GlType.HALF_FLOAT,
  float16x4: GlType.HALF_FLOAT,
  float32: GlType.FLOAT,
  float32x2: GlType.FLOAT,
  float32x3: GlType.FLOAT,
  float32x4: GlType.FLOAT,
  uint32: GlType.UNSIGNED_INT,
  uint32x2: GlType.UNSIGNED_INT,
  uint32x3: GlType.UNSIGNED_INT,
  uint32x4: GlType.UNSIGNED_INT,
  sint32: GlType.INT,
  sint32x2: GlType.INT,
  sint32x3: GlType.INT,
  sint32x4: GlType.INT,
}

/**
 * @param format
 * @internal
 */
export function getGlTypeFromFormat(format: VertexFormat): number {
  return infoMap[format] ?? infoMap.float32
}
