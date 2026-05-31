/**
 * 豆包 Seedream 绘图 API 工具
 * 走 POST /v1/images/generations，画质与比例追加到 prompt 末尾
 */

import {
  SEEDREAM_SIZE_OPTIONS,
  SEEDREAM_4K_SIZE_OPTIONS
} from '@/config/models'

/** 像素尺寸 key → 比例标签，如 2560x1440 → 16:9 */
export const getSeedreamAspectRatio = (sizeKey) => {
  const option = [...SEEDREAM_SIZE_OPTIONS, ...SEEDREAM_4K_SIZE_OPTIONS]
    .find((o) => o.key === sizeKey)
  return option?.label || '1:1'
}

/** 画质 → prompt 后缀标签 */
export const getSeedreamQualityTag = (quality) => {
  return quality === '4k' ? '-4k' : '-2k'
}

/**
 * 构建 Seedream 最终 prompt
 * 例：「小猫」+ 4K + 16:9 → 「小猫 -4k, 16:9」
 */
export const buildSeedreamPrompt = (prompt, quality, size) => {
  const base = (prompt || '').trim()
  const qualityTag = getSeedreamQualityTag(quality)
  const ratio = getSeedreamAspectRatio(size)
  const suffix = `${qualityTag}, ${ratio}`
  return base ? `${base} ${suffix}` : suffix
}

export const isSeedreamImageModel = (modelConfig) =>
  modelConfig?.imageApi === 'seedream-generations'
