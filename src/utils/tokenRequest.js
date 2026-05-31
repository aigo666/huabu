/**
 * 按模型匹配令牌并依次重试请求
 */

import { getProviderConfig, getDefaultBaseUrl } from '@/config/providers'
import { isSeedance2VideoModel } from '@/utils/seedance2Video'
import { STORAGE_KEYS, getStoredJson } from './apiTokens'

export const getTokenBaseUrl = (token) => {
  if (token?.baseUrl) return token.baseUrl.replace(/\/$/, '')
  return getDefaultBaseUrl(token?.provider || 'chatfire').replace(/\/$/, '')
}

export const getTokenEndpoints = (token) => {
  const config = getProviderConfig(token?.provider || 'chatfire')
  const base = getTokenBaseUrl(token)
  const ep = config.endpoints || {}
  return {
    chat: `${base}${ep.chat || '/v1/chat/completions'}`,
    image: `${base}${ep.image || '/v1/images/generations'}`,
    video: `${base}${ep.video || '/v1/videos'}`,
    videoQuery: `${base}${ep.videoQuery || '/v1/videos/{taskId}'}`
  }
}

/** 按视频模型选择创建/查询端点（Seedance2 走 /v1/video/generations） */
export const getVideoEndpointsForModel = (token, modelKey) => {
  const config = getProviderConfig(token?.provider || 'chatfire')
  const base = getTokenBaseUrl(token)
  const ep = config.endpoints || {}

  if (isSeedance2VideoModel(modelKey)) {
    return {
      video: `${base}${ep.videoGenerations || '/v1/video/generations'}`,
      videoQuery: `${base}${ep.videoGenerationsQuery || '/v1/video/task/{taskId}'}`
    }
  }

  return {
    video: `${base}${ep.video || '/v1/videos'}`,
    videoQuery: `${base}${ep.videoQuery || '/v1/videos/{taskId}'}`
  }
}

export const adaptRequestForToken = (token, type, params) => {
  const config = getProviderConfig(token?.provider || 'chatfire')
  if (config.requestAdapter?.[type]) {
    return config.requestAdapter[type](params)
  }
  return params
}

export const adaptResponseForToken = (token, type, response) => {
  const config = getProviderConfig(token?.provider || 'chatfire')
  if (config.responseAdapter?.[type]) {
    return config.responseAdapter[type](response)
  }
  return response
}

/** 获取支持指定模型的令牌列表（当前令牌优先，其余按配置顺序） */
export const getTokensForModel = (modelKey, type, preferredTokenId = null) => {
  const tokens = getStoredJson(STORAGE_KEYS.API_TOKENS, [])

  const eligible = tokens.filter(
    (t) => t.apiKey && t.models?.[type]?.includes(modelKey)
  )

  if (preferredTokenId) {
    const fixed = eligible.find((t) => t.id === preferredTokenId)
    return fixed ? [fixed] : []
  }

  const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_TOKEN_ID)
  const sorted = []
  const current = eligible.find((t) => t.id === currentId)
  if (current) sorted.push(current)
  for (const t of eligible) {
    if (t.id !== currentId) sorted.push(t)
  }
  return sorted
}

export const getTokenById = (tokenId) => {
  const tokens = getStoredJson(STORAGE_KEYS.API_TOKENS, [])
  return tokens.find((t) => t.id === tokenId) || null
}

/**
 * 依次使用可用令牌发起请求，成功即返回，全部失败则抛出汇总错误
 * @param {Object} options
 * @param {string} options.modelKey - 模型 key
 * @param {'chat'|'image'|'video'} options.type
 * @param {(token: object) => Promise<any>} options.requestFn
 */
export const executeWithModelTokens = async ({ modelKey, type, tokenId, requestFn }) => {
  const tokens = getTokensForModel(modelKey, type, tokenId || null)

  if (!tokens.length) {
    if (tokenId) {
      const token = getTokenById(tokenId)
      const label = token?.name || '指定令牌'
      if (!token?.apiKey) {
        throw new Error(`节点指定的令牌「${label}」未设置 API Key`)
      }
      throw new Error(`节点指定的令牌「${label}」未配置模型「${modelKey}」`)
    }
    throw new Error(`没有配置了模型「${modelKey}」的可用令牌，请在 API 设置中为令牌添加该模型`)
  }

  const errors = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const label = token.name || `令牌${i + 1}`
    try {
      console.log(`[TokenRetry] 尝试 ${i + 1}/${tokens.length}「${label}」模型=${modelKey}`)
      const result = await requestFn(token)
      console.log(`[TokenRetry]「${label}」请求成功`)
      return { result, token }
    } catch (err) {
      const msg = err?.message || String(err)
      errors.push(`「${label}」: ${msg}`)
      console.warn(`[TokenRetry]「${label}」失败:`, msg)
    }
  }

  throw new Error(`所有令牌均请求失败:\n${errors.join('\n')}`)
}

/** 请求选项：指定令牌 Key，重试时静默 Toast */
export const withTokenRequest = (token, extra = {}) => ({
  apiKey: token.apiKey,
  silentError: true,
  ...extra
})
