import type { ImagePipeline, PipelineImage } from 'modern-idoc'

/**
 * 图片处理管线解析器：给定管线步骤与原图像素，返回处理后的像素。
 *
 * 引擎本身不认识任何具名管线，只在图片填充加载时把 `pipelines + 像素` 交给注入的
 * 解析器烘焙（仿 `setCanvasFactory`）。具体管线（描边/调色/抠图等）由上层
 * （如 mce + @mce/bigesj）注册并实现。返回 `undefined` 表示放弃处理、沿用原图。
 */
export type ImagePipelineResolver = (
  pipelines: ImagePipeline[],
  image: PipelineImage,
) => Promise<PipelineImage | undefined>

let _imagePipelineResolver: ImagePipelineResolver | undefined

export function setImagePipelineResolver(resolver: ImagePipelineResolver | undefined): void {
  _imagePipelineResolver = resolver
}

export function getImagePipelineResolver(): ImagePipelineResolver | undefined {
  return _imagePipelineResolver
}
