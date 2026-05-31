/**
 * Seedance 2.0 视频生成 | POST /v1/video/generations JSON
 * @see https://xgapi.apifox.cn/444231142e0 文生视频
 * @see https://xgapi.apifox.cn/444231742e0 单图生视频
 * @see https://xgapi.apifox.cn/444232161e0 首尾帧生视频
 * @see https://xgapi.apifox.cn/444232701e0 多图参考
 */

export const SEEDANCE_2_VIDEO_MODELS = [
  'doubao-seedance-2-0-fast-260128',
  'doubao-seedance-2-0-260128',
]

export const isSeedance2VideoModel = (modelKey) => SEEDANCE_2_VIDEO_MODELS.includes(modelKey)

/** UI model key + 分辨率 → API model 名 */
export const resolveSeedance2ApiModel = (modelKey, resolution = '720p') => {
  const res = resolution === '480p' ? '480p' : '720p'
  return `${modelKey}-${res}`
}

const toImageUrl = (imageData) => {
  if (!imageData) return ''
  if (typeof imageData === 'string') return imageData
  return String(imageData)
}

/**
 * 构建 Seedance 2.0 请求体
 */
export const buildSeedance2VideoRequest = ({
  modelKey,
  resolution,
  prompt,
  duration,
  aspectRatio,
  first_frame_image,
  last_frame_image,
  reference_images = [],
}) => {
  const content = []

  if (prompt) {
    content.push({ type: 'text', text: prompt })
  }

  let mode = 'text'

  if (first_frame_image && last_frame_image) {
    mode = 'first_last'
    content.push({
      type: 'image_url',
      url: toImageUrl(first_frame_image),
      role: 'first_frame',
    })
    content.push({
      type: 'image_url',
      url: toImageUrl(last_frame_image),
      role: 'last_frame',
    })
  } else if (reference_images.length > 1) {
    mode = 'multi_reference'
    reference_images.forEach((img) => {
      content.push({
        type: 'image_url',
        url: toImageUrl(img),
        role: 'reference_image',
      })
    })
  } else if (reference_images.length === 1) {
    mode = 'reference'
    content.push({
      type: 'image_url',
      url: toImageUrl(reference_images[0]),
      role: 'reference_image',
    })
  } else if (first_frame_image) {
    mode = 'single_image'
    content.push({
      type: 'image_url',
      url: toImageUrl(first_frame_image),
      role: 'image',
    })
  }

  const body = {
    model: resolveSeedance2ApiModel(modelKey, resolution),
    content,
    duration: duration ?? 5,
    aspect_ratio: aspectRatio || '16:9',
  }

  if (mode === 'single_image') {
    body.extra_body = {
      generate_audio: false,
      watermark: false,
    }
  }

  return body
}
