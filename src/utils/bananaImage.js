/**
 * Nano Banana 绘图 API 工具
 * 文生图 / 图生图均走 /v1/chat/completions
 * @see https://xgapi.apifox.cn/435823444e0
 * @see https://xgapi.apifox.cn/435823769e0
 */

import { isBananaChatImageModel } from '@/config/models'

export { isBananaChatImageModel }

/** 16x9 → 16:9；auto 时不传比例字段 */
export const sizeKeyToAspectRatio = (sizeKey) => {
  if (!sizeKey || sizeKey === 'auto') return null
  if (sizeKey.includes(':')) return sizeKey
  return sizeKey.replace('x', ':')
}

const normalizeImages = (images) => {
  if (!images) return []
  const list = Array.isArray(images) ? images : [images]
  return list.filter(Boolean)
}

/**
 * 构建 Banana 文生图 / 图生图请求体
 */
export const buildBananaChatImageRequest = ({
  model,
  apiModel,
  prompt,
  size,
  quality,
  images = []
}) => {
  const refImages = normalizeImages(images)
  const aspectRatio = sizeKeyToAspectRatio(size)
  const imageSize = quality || '1K'

  let content
  if (refImages.length > 0) {
    content = [
      { type: 'text', text: prompt || '' },
      ...refImages.map((url) => ({
        type: 'image_url',
        image_url: { url }
      }))
    ]
  } else {
    content = prompt || ''
  }

  const imageConfig = { image_size: imageSize }
  if (aspectRatio) {
    imageConfig.aspect_ratio = aspectRatio
  }

  return {
    model: apiModel || model,
    messages: [{ role: 'user', content }],
    stream: false,
    extra_body: {
      google: {
        image_config: imageConfig
      }
    }
  }
}

/**
 * 清理图片 URL，去掉 markdown / 文本包裹产生的尾部符号
 * 例如 https://xxx.jpg) → https://xxx.jpg
 */
export const sanitizeImageUrl = (raw) => {
  if (!raw || typeof raw !== 'string') return ''
  let url = raw.trim()

  const match = url.match(/https?:\/\/[^\s"'<>]+/)
  if (match) url = match[0]

  // 去掉链接末尾多余的括号、引号等（API 常返回 markdown 格式链接）
  url = url.replace(/[)\]}>,;+'"]+$/, '')

  return url
}

const extractUrlFromContent = (content) => {
  if (!content) return ''
  if (typeof content === 'string') {
    return sanitizeImageUrl(content)
  }
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part?.type === 'text' && part.text) {
        const url = sanitizeImageUrl(part.text)
        if (url) return url
      }
      if (part?.type === 'image_url' && part.image_url?.url) {
        return sanitizeImageUrl(part.image_url.url)
      }
    }
  }
  return ''
}

/**
 * 解析 Banana chat/completions 绘图响应
 */
export const parseBananaChatImageResponse = (response) => {
  const payload = response?.data?.choices !== undefined ? response.data : response

  const outputs = payload?.media?.outputs
  if (Array.isArray(outputs) && outputs.length > 0) {
    return outputs
      .filter(Boolean)
      .map((url) => ({ url: sanitizeImageUrl(url), revisedPrompt: '' }))
      .filter((item) => item.url)
  }

  const choice = payload?.choices?.[0]
  const content = choice?.message?.content ?? choice?.delta?.content ?? ''
  const url = extractUrlFromContent(content)

  if (url) {
    return [{ url, revisedPrompt: '' }]
  }

  return []
}
