export class GlRenderTarget {
  width = -1
  height = -1
  msaa = false
  framebuffer2?: WebGLFramebuffer
  msaaRenderBuffer: WebGLRenderbuffer[] = []
  depthStencilRenderBuffer?: WebGLRenderbuffer

  constructor(
    public framebuffer: WebGLFramebuffer,
  ) {
    //
  }
}
