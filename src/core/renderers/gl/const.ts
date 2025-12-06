export enum StencilMode {
  disabled = 0,
  renderingMaskAdd = 1,
  maskActive = 2,
  inverseMaskActive = 3,
  renderingMaskRemove = 4,
  none = 5,
}

export enum Clear {
  none = 0,
  color = 16384,
  stencil = 1024,
  depth = 256,
  // eslint-disable-next-line ts/prefer-literal-enum-member
  colorDepth = color | depth,
  // eslint-disable-next-line ts/prefer-literal-enum-member
  colorStencil = color | stencil,
  // eslint-disable-next-line ts/prefer-literal-enum-member
  depthStencil = depth | stencil,
  // eslint-disable-next-line ts/prefer-literal-enum-member
  all = color | depth | stencil,
}

export type ClearOrBool = Clear | boolean
