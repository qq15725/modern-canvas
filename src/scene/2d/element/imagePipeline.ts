import type { ImagePipeline, PipelineImage } from 'modern-idoc'

/**
 * 图片处理管线解析器：给定管线步骤与原图像素，返回处理后的像素。
 *
 * 引擎本身不认识任何具名管线，图片填充加载时把 `imagePipelines + 像素` 交给解析器烘焙。
 * 解析器挂在引擎实例上（`SceneTree.imagePipelineResolver`，Engine 继承），由宿主
 * 按实例注入——不走全局，多引擎实例互不影响。
 * 返回 `undefined` 表示放弃处理、沿用原图。
 */
export type ImagePipelineResolver = (
  imagePipelines: ImagePipeline[],
  image: PipelineImage,
) => Promise<PipelineImage | undefined>
