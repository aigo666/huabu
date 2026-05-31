/**
 * API 令牌工具 | 多令牌读写
 */

export const STORAGE_KEYS = {
  API_TOKENS: 'api-tokens',
  CURRENT_TOKEN_ID: 'current-api-token-id'
}

export const createTokenId = () =>
  `token_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

export const createEmptyToken = (overrides = {}) => ({
  id: createTokenId(),
  name: '新令牌',
  apiKey: '',
  provider: 'chatfire',
  baseUrl: 'https://api.xgapi.top',
  models: { chat: [], image: [], video: [] },
  customModels: { chat: [], image: [], video: [] },
  ...overrides
})

export const getStoredJson = (key, defaultValue = null) => {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

/** 获取当前激活令牌的 API Key（供 request 拦截器使用） */
export const getCurrentTokenApiKey = () => {
  const tokens = getStoredJson(STORAGE_KEYS.API_TOKENS, [])
  if (!tokens.length) return ''

  const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_TOKEN_ID)
  const token = tokens.find((t) => t.id === currentId) || tokens[0]
  return token?.apiKey || ''
}

/** 获取当前激活令牌对象 */
export const getCurrentToken = () => {
  const tokens = getStoredJson(STORAGE_KEYS.API_TOKENS, [])
  if (!tokens.length) return null
  const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_TOKEN_ID)
  return tokens.find((t) => t.id === currentId) || tokens[0]
}
