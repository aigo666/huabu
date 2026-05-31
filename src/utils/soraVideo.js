/**
 * Sora 2 视频生成
 * - 文生视频 JSON: https://xgapi.apifox.cn/461056226e0
 * - 参考图 multipart: https://xgapi.apifox.cn/421149640e0
 * 仅支持 prompt + input_reference（参考图），无首尾帧
 * 时长对应不同 API 模型名：4s→sora-2, 8s→sora-2-8s, 12s→sora-2-12s
 */

export const SORA_VIDEO_MODEL_KEY = 'sora-2'

export const isSoraVideoModel = (modelKey) => modelKey === SORA_VIDEO_MODEL_KEY

/** 时长 → API model 名 */
export const resolveSoraApiModel = (duration) => {
  if (duration === 8) return 'sora-2-8s'
  if (duration === 12) return 'sora-2-12s'
  return 'sora-2'
}

export const soraSizeToAspectRatio = (size) => {
  if (size === '720x1280') return '9:16'
  if (size === '1280x720') return '16:9'
  return '16:9'
}

import { imageSourceToBlob } from './veoVideo'

export { imageSourceToBlob }

const blobToFile = (blob, filename) =>
  blob instanceof File ? blob : new File([blob], filename, { type: blob.type || 'image/jpeg' })

/**
 * Sora 文生视频 JSON 请求体
 */
export const buildSoraTextVideoRequest = ({
  prompt,
  duration,
  size,
  negativePrompt,
  seed,
}) => {
  const sz = size || '1280x720'
  return {
    model: resolveSoraApiModel(duration),
    prompt,
    duration: duration ?? 8,
    size: sz,
    metadata: {
      negativePrompt: negativePrompt ?? '',
      resolution: '720p',
      aspectRatio: soraSizeToAspectRatio(sz),
      seed: seed ?? Math.floor(Math.random() * 99999999),
    },
  }
}

/**
 * Sora 参考图 multipart 请求体
 */
export const buildSoraVideoFormData = async ({
  prompt,
  duration,
  size,
  input_reference,
}) => {
  const fd = new FormData()
  const sz = size || '1280x720'
  fd.append('model', resolveSoraApiModel(duration))
  fd.append('prompt', prompt)
  fd.append('seconds', String(duration ?? 4))
  fd.append('size', sz)

  if (input_reference) {
    const blob = await imageSourceToBlob(input_reference)
    if (blob) fd.append('input_reference', blobToFile(blob, 'input_reference.jpg'))
  }

  return fd
}
