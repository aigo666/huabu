/**
 * Veo 3.1 视频生成
 * - 文生视频 JSON: https://xgapi.apifox.cn/461056226e0
 * - 图生视频 multipart: https://xgapi.apifox.cn/461056860e0
 */

export const VEO_VIDEO_MODELS = ['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview']

export const isVeoVideoModel = (modelKey) => VEO_VIDEO_MODELS.includes(modelKey)

/** resolution + aspectRatio → size (如 1280x720) */
const VEO_SIZE_MAP = {
  '480p': {
    '16:9': '854x480',
    '9:16': '480x854',
    '1:1': '480x480',
    '4:3': '640x480',
    '3:4': '480x640',
  },
  '720p': {
    '16:9': '1280x720',
    '9:16': '720x1280',
    '1:1': '720x720',
    '4:3': '960x720',
    '3:4': '720x960',
  },
  '1080p': {
    '16:9': '1920x1080',
    '9:16': '1080x1920',
    '1:1': '1080x1080',
    '4:3': '1440x1080',
    '3:4': '1080x1440',
  },
  '4k': {
    '16:9': '3840x2160',
    '9:16': '2160x3840',
    '1:1': '2160x2160',
    '4:3': '2880x2160',
    '3:4': '2160x2880',
  },
}

export const resolveVeoSize = (resolution = '720p', aspectRatio = '16:9') => {
  const resKey = resolution === '4K' ? '4k' : resolution
  return VEO_SIZE_MAP[resKey]?.[aspectRatio] || VEO_SIZE_MAP['720p']['16:9']
}

export const veoNeedsMultipart = ({ first_frame_image, last_frame_image, reference_images = [] } = {}) =>
  !!(first_frame_image || last_frame_image || reference_images.length)

/**
 * 文生视频 JSON 请求体
 */
export const buildVeoTextVideoRequest = ({
  model,
  prompt,
  duration,
  resolution,
  aspectRatio,
  negativePrompt,
  seed,
}) => {
  const res = resolution || '720p'
  const ratio = aspectRatio || '16:9'
  return {
    model,
    prompt,
    duration: duration ?? 8,
    size: resolveVeoSize(res, ratio),
    metadata: {
      negativePrompt: negativePrompt ?? '',
      resolution: res,
      aspectRatio: ratio,
      seed: seed ?? Math.floor(Math.random() * 99999999),
    },
  }
}

export const imageSourceToBlob = async (imageData) => {
  if (!imageData) return null
  if (imageData instanceof Blob) return imageData
  if (imageData instanceof File) return imageData

  if (typeof imageData === 'string' && imageData.startsWith('data:')) {
    const res = await fetch(imageData)
    return res.blob()
  }

  if (typeof imageData === 'string' && /^https?:\/\//.test(imageData)) {
    const res = await fetch(imageData)
    if (!res.ok) throw new Error('参考图加载失败')
    return res.blob()
  }

  if (typeof imageData === 'string') {
    const binary = atob(imageData)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: 'image/jpeg' })
  }

  return null
}

const blobToFile = (blob, filename) =>
  blob instanceof File ? blob : new File([blob], filename, { type: blob.type || 'image/jpeg' })

/**
 * 图生视频 multipart 请求体（首尾帧 / 多图参考）
 */
export const buildVeoVideoFormData = async ({
  model,
  prompt,
  seconds,
  resolution,
  aspectRatio,
  first_frame_image,
  last_frame_image,
  reference_images = [],
}) => {
  const fd = new FormData()
  fd.append('model', model)
  if (prompt) fd.append('prompt', prompt)
  if (seconds != null && seconds !== '') fd.append('seconds', String(seconds))
  if (resolution) fd.append('resolution', resolution)
  if (aspectRatio) fd.append('aspectRatio', aspectRatio)

  if (first_frame_image) {
    const blob = await imageSourceToBlob(first_frame_image)
    if (blob) fd.append('input_reference', blobToFile(blob, 'input_reference.jpg'))
  }

  if (last_frame_image) {
    const blob = await imageSourceToBlob(last_frame_image)
    if (blob) fd.append('last_frame', blobToFile(blob, 'last_frame.jpg'))
  }

  for (let i = 0; i < reference_images.length; i++) {
    const blob = await imageSourceToBlob(reference_images[i])
    if (blob) fd.append('reference_image', blobToFile(blob, `reference_${i + 1}.jpg`))
  }

  return fd
}
