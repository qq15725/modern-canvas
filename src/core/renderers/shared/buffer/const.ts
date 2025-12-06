export enum BufferUsage {
  mapRead = 0x0001,
  mapWrite = 0x0002,
  copySrc = 0x0004,
  copyDst = 0x0008,
  index = 0x0010,
  vertex = 0x0020,
  uniform = 0x0040,
  storage = 0x0080,
  indirect = 0x0100,
  queryResolve = 0x0200,
  static = 0x0400,
}
