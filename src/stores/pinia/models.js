/**
 * Pinia Store: Model Config | 模型配置 Store
 * 管理模型配置、渠道切换和模型选择
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
  CHAT_MODELS,
  IMAGE_MODELS,
  VIDEO_MODELS,
  DEFAULT_CHAT_MODEL,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL
} from '@/config/models'
import { PROVIDERS, getProviderList, getDefaultProvider, getProviderConfig, getDefaultBaseUrl } from '@/config/providers'
import { createTokenId, createEmptyToken, STORAGE_KEYS as TOKEN_STORAGE_KEYS } from '@/utils/apiTokens'

// 存储键名
const STORAGE_KEYS = {
  PROVIDER: 'api-provider',
  CUSTOM_CHAT_MODELS: 'custom-chat-models',
  CUSTOM_IMAGE_MODELS: 'custom-image-models',
  CUSTOM_VIDEO_MODELS: 'custom-video-models',
  SELECTED_CHAT_MODEL: 'selected-chat-model',
  SELECTED_IMAGE_MODEL: 'selected-image-model',
  SELECTED_VIDEO_MODEL: 'selected-video-model',
  CUSTOM_CHAT_MODELS_BY_PROVIDER: 'custom-chat-models-by-provider',
  CUSTOM_IMAGE_MODELS_BY_PROVIDER: 'custom-image-models-by-provider',
  CUSTOM_VIDEO_MODELS_BY_PROVIDER: 'custom-video-models-by-provider',
  API_KEYS_BY_PROVIDER: 'api-keys-by-provider',
  BASE_URLS_BY_PROVIDER: 'base-urls-by-provider',
  API_TOKENS: TOKEN_STORAGE_KEYS.API_TOKENS,
  CURRENT_TOKEN_ID: TOKEN_STORAGE_KEYS.CURRENT_TOKEN_ID
}

/**
 * Get stored value from localStorage
 */
const getStored = (key, defaultValue = '') => {
  try {
    return localStorage.getItem(key) || defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Set stored value to localStorage
 */
const setStored = (key, value) => {
  try {
    if (value) {
      localStorage.setItem(key, value)
    } else {
      localStorage.removeItem(key)
    }
  } catch {
    // ignore
  }
}

/**
 * Get stored JSON value from localStorage
 */
const getStoredJson = (key, defaultValue = []) => {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Set stored JSON value to localStorage
 */
const setStoredJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

const removeStored = (key) => {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

const migrateLegacyToTokens = () => {
  const existing = getStoredJson(STORAGE_KEYS.API_TOKENS, [])
  if (existing.length) return existing

  const legacyKeys = getStoredJson(STORAGE_KEYS.API_KEYS_BY_PROVIDER, {})
  const legacyBaseUrls = getStoredJson(STORAGE_KEYS.BASE_URLS_BY_PROVIDER, {})
  const legacyCustomChat = getStoredJson(STORAGE_KEYS.CUSTOM_CHAT_MODELS, [])
  const legacyCustomImage = getStoredJson(STORAGE_KEYS.CUSTOM_IMAGE_MODELS, [])
  const legacyCustomVideo = getStoredJson(STORAGE_KEYS.CUSTOM_VIDEO_MODELS, [])

  const allKeys = {
    chat: CHAT_MODELS.map((m) => m.key),
    image: IMAGE_MODELS.map((m) => m.key),
    video: VIDEO_MODELS.map((m) => m.key)
  }

  const tokens = []
  for (const [provider, apiKey] of Object.entries(legacyKeys)) {
    if (!apiKey) continue
    tokens.push({
      id: createTokenId(),
      name: provider === 'chatfire' ? '默认令牌' : provider,
      apiKey,
      provider,
      baseUrl: legacyBaseUrls[provider] || '',
      models: { chat: [...allKeys.chat], image: [...allKeys.image], video: [...allKeys.video] },
      customModels: {
        chat: [...legacyCustomChat],
        image: [...legacyCustomImage],
        video: [...legacyCustomVideo]
      }
    })
  }
  return tokens
}

const IMAGE_CUSTOM_DEFAULTS = {
  sizes: [],
  defaultParams: { quality: 'standard', style: 'vivid' }
}

const VIDEO_CUSTOM_DEFAULTS = {
  ratios: ['16x9', '9:16', '1:1'],
  durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
  defaultParams: { ratio: '16:9', duration: 5 }
}

const BUILTIN_MODELS_BY_TYPE = {
  chat: CHAT_MODELS,
  image: IMAGE_MODELS,
  video: VIDEO_MODELS
}

const CUSTOM_DEFAULTS_BY_TYPE = {
  chat: {},
  image: IMAGE_CUSTOM_DEFAULTS,
  video: VIDEO_CUSTOM_DEFAULTS
}

const resolveTokenModels = (token, type, builtinModels, customDefaults = {}) => {
  if (!token) {
    return builtinModels.map((m) => ({ ...m, isCustom: false }))
  }

  const keys = token.models?.[type] || []
  if (!keys.length) return []

  return keys
    .map((key) => {
      const builtin = builtinModels.find((m) => m.key === key)
      if (builtin) return { ...builtin, isCustom: false }

      const custom = token.customModels?.[type]?.find((m) => m.key === key)
      if (custom) {
        return {
          label: custom.label || custom.key,
          key: custom.key,
          isCustom: true,
          provider: [token.provider],
          ...customDefaults
        }
      }

      // 已下架的内置模型 key 残留，不当作自定义展示
      return null
    })
    .filter(Boolean)
}

/** 清理令牌中已失效的模型 key（内置已移除且非用户自定义） */
const sanitizeTokenModels = (token) => {
  const types = ['chat', 'image', 'video']
  for (const type of types) {
    const builtin = BUILTIN_MODELS_BY_TYPE[type] || []
    if (!token.models?.[type]) token.models = { ...token.models, [type]: [] }
    if (!token.customModels?.[type]) token.customModels = { ...token.customModels, [type]: [] }

    token.models[type] = token.models[type].filter(
      (key) =>
        builtin.some((m) => m.key === key) ||
        token.customModels[type].some((m) => m.key === key)
    )
    token.customModels[type] = token.customModels[type].filter((m) =>
      token.models[type].includes(m.key)
    )
  }
  return token
}

/**
 * 检查模型是否支持指定渠道
 */
const isModelSupported = (model, provider) => {
  if (!model.provider) {
    return true
  }
  return model.provider.includes(provider)
}

export const useModelStore = defineStore('model', () => {
  // ============ Provider 状态 | Provider State ============

  // 当前选中的渠道
  const currentProvider = ref(getStored(STORAGE_KEYS.PROVIDER) || getDefaultProvider())

  // 渠道列表
  const providerList = computed(() => getProviderList())

  // 当前渠道配置
  const providerConfig = computed(() => getProviderConfig(currentProvider.value))

  // 当前渠道标签
  const providerLabel = computed(() => providerConfig.value.label || currentProvider.value)

  // 设置当前渠道
  const setProvider = (provider) => {
    if (PROVIDERS[provider]) {
      currentProvider.value = provider
      setStored(STORAGE_KEYS.PROVIDER, provider)
    }
  }

  // 清除渠道配置
  const clearProvider = () => {
    currentProvider.value = getDefaultProvider()
    removeStored(STORAGE_KEYS.PROVIDER)
  }

  // 适配请求参数
  const adaptRequest = (type, params) => {
    const config = providerConfig.value
    if (config.requestAdapter && config.requestAdapter[type]) {
      return config.requestAdapter[type](params)
    }
    return params
  }

  // 适配响应数据
  const adaptResponse = (type, response) => {
    const config = providerConfig.value
    if (config.responseAdapter && config.responseAdapter[type]) {
      return config.responseAdapter[type](response)
    }
    return response
  }

  // ============ Custom Models 状态 | Custom Models State ============

  // 全局自定义模型（不区分渠道）
  const customChatModels = ref(getStoredJson(STORAGE_KEYS.CUSTOM_CHAT_MODELS, []))
  const customImageModels = ref(getStoredJson(STORAGE_KEYS.CUSTOM_IMAGE_MODELS, []))
  const customVideoModels = ref(getStoredJson(STORAGE_KEYS.CUSTOM_VIDEO_MODELS, []))

  // 按渠道存储的自定义模型 | 结构: { 'openai': [{key, label}], 'chatfire': [{key, label}] }
  const customChatModelsByProvider = ref(getStoredJson(STORAGE_KEYS.CUSTOM_CHAT_MODELS_BY_PROVIDER, {}))
  const customImageModelsByProvider = ref(getStoredJson(STORAGE_KEYS.CUSTOM_IMAGE_MODELS_BY_PROVIDER, {}))
  const customVideoModelsByProvider = ref(getStoredJson(STORAGE_KEYS.CUSTOM_VIDEO_MODELS_BY_PROVIDER, {}))

  // ============ API Tokens 状态 ============

  const apiTokens = ref(
    migrateLegacyToTokens().map((token) => sanitizeTokenModels({ ...token }))
  )
  setStoredJson(STORAGE_KEYS.API_TOKENS, apiTokens.value)
  const currentTokenId = ref(getStored(STORAGE_KEYS.CURRENT_TOKEN_ID, ''))

  if (!currentTokenId.value && apiTokens.value.length) {
    currentTokenId.value = apiTokens.value[0].id
    setStored(STORAGE_KEYS.CURRENT_TOKEN_ID, currentTokenId.value)
  }

  const currentToken = computed(() =>
    apiTokens.value.find((t) => t.id === currentTokenId.value) || apiTokens.value[0] || null
  )

  const currentApiKey = computed(() => currentToken.value?.apiKey || '')
  const currentBaseUrl = computed(() => {
    const token = currentToken.value
    if (token?.baseUrl) return token.baseUrl
    const provider = token?.provider || currentProvider.value
    return getDefaultBaseUrl(provider)
  })

  const isApiConfigured = computed(() => !!currentApiKey.value)

  const setCurrentTokenId = (id) => {
    currentTokenId.value = id
    setStored(STORAGE_KEYS.CURRENT_TOKEN_ID, id)
    const token = apiTokens.value.find((t) => t.id === id)
    if (token?.provider) {
      currentProvider.value = token.provider
      setStored(STORAGE_KEYS.PROVIDER, token.provider)
    }
  }

  const addToken = (payload = {}) => {
    const token = createEmptyToken(payload)
    apiTokens.value.push(token)
    if (apiTokens.value.length === 1) {
      setCurrentTokenId(token.id)
    }
    return token
  }

  const updateToken = (id, patch) => {
    const idx = apiTokens.value.findIndex((t) => t.id === id)
    if (idx === -1) return false
    apiTokens.value[idx] = { ...apiTokens.value[idx], ...patch }
    if (id === currentTokenId.value && patch.provider) {
      currentProvider.value = patch.provider
      setStored(STORAGE_KEYS.PROVIDER, patch.provider)
    }
    return true
  }

  const removeToken = (id) => {
    const idx = apiTokens.value.findIndex((t) => t.id === id)
    if (idx === -1) return false
    apiTokens.value.splice(idx, 1)
    if (currentTokenId.value === id) {
      const next = apiTokens.value[0]
      if (next) setCurrentTokenId(next.id)
      else {
        currentTokenId.value = ''
        removeStored(STORAGE_KEYS.CURRENT_TOKEN_ID)
      }
    }
    return true
  }

  const ensureTokenModelList = (token, type) => {
    if (!token.models[type]) token.models[type] = []
    if (!token.customModels[type]) token.customModels[type] = []
  }

  const isTokenModelEnabled = (tokenId, type, modelKey) => {
    const token = apiTokens.value.find((t) => t.id === tokenId)
    return token?.models?.[type]?.includes(modelKey) || false
  }

  const addTokenBuiltinModel = (tokenId, type, modelKey) => {
    const token = apiTokens.value.find((t) => t.id === tokenId)
    if (!token || !modelKey) return false
    ensureTokenModelList(token, type)
    if (token.models[type].includes(modelKey)) return false
    token.models[type].push(modelKey)
    return true
  }

  const removeTokenModel = (tokenId, type, modelKey) => {
    const token = apiTokens.value.find((t) => t.id === tokenId)
    if (!token?.models?.[type]) return false
    const idx = token.models[type].indexOf(modelKey)
    if (idx === -1) return false
    token.models[type].splice(idx, 1)
    if (token.customModels?.[type]) {
      token.customModels[type] = token.customModels[type].filter((m) => m.key !== modelKey)
    }
    return true
  }

  const addTokenCustomModel = (tokenId, type, modelKey, label = '') => {
    const token = apiTokens.value.find((t) => t.id === tokenId)
    if (!token || !modelKey) return false
    ensureTokenModelList(token, type)
    if (token.models[type].includes(modelKey)) return false
    token.models[type].push(modelKey)
    token.customModels[type].push({ key: modelKey, label: label || modelKey })
    return true
  }

  /** 节点级模型列表：未指定令牌时合并全部令牌已启用模型，指定令牌时仅该令牌模型 */
  const getNodeTokenModels = (type, tokenId = '') => {
    const builtin = BUILTIN_MODELS_BY_TYPE[type] || []
    const customDefaults = CUSTOM_DEFAULTS_BY_TYPE[type] || {}

    if (tokenId) {
      const token = apiTokens.value.find((t) => t.id === tokenId)
      if (!token?.apiKey) return []
      return resolveTokenModels(token, type, builtin, customDefaults)
    }

    const seen = new Set()
    const result = []
    for (const token of apiTokens.value.filter((t) => t.apiKey)) {
      for (const model of resolveTokenModels(token, type, builtin, customDefaults)) {
        if (!seen.has(model.key)) {
          seen.add(model.key)
          result.push(model)
        }
      }
    }
    return result
  }

  const getNodeTokenModelOptions = (type, tokenId = '') =>
    getNodeTokenModels(type, tokenId).map((m) => ({ label: m.label, key: m.key }))

  // 兼容旧 API（逐步废弃）
  const apiKeysByProvider = computed(() => {
    const map = {}
    for (const token of apiTokens.value) {
      if (token.provider && token.apiKey) map[token.provider] = token.apiKey
    }
    return map
  })

  const baseUrlsByProvider = computed(() => {
    const map = {}
    for (const token of apiTokens.value) {
      if (token.provider && token.baseUrl) map[token.provider] = token.baseUrl
    }
    return map
  })

  const setApiKeyByProvider = (provider, apiKey) => {
    const token = apiTokens.value.find((t) => t.provider === provider)
    if (token) updateToken(token.id, { apiKey })
    else addToken({ name: '默认令牌', provider, apiKey, models: { chat: CHAT_MODELS.map(m => m.key), image: IMAGE_MODELS.map(m => m.key), video: VIDEO_MODELS.map(m => m.key) } })
  }

  const setBaseUrlByProvider = (provider, baseUrl) => {
    const token = apiTokens.value.find((t) => t.provider === provider)
    if (token) updateToken(token.id, { baseUrl })
  }

  const clearApiConfigByProvider = (provider) => {
    const token = apiTokens.value.find((t) => t.provider === provider)
    if (token) removeToken(token.id)
  }

  // 内置模型目录（供令牌配置 UI 使用）
  const builtinChatModels = computed(() => CHAT_MODELS)
  const builtinImageModels = computed(() => IMAGE_MODELS)
  const builtinVideoModels = computed(() => VIDEO_MODELS)

  // 选中的模型
  const selectedChatModel = ref(getStored(STORAGE_KEYS.SELECTED_CHAT_MODEL, DEFAULT_CHAT_MODEL))
  const selectedImageModel = ref(getStored(STORAGE_KEYS.SELECTED_IMAGE_MODEL, DEFAULT_IMAGE_MODEL))
  const selectedVideoModel = ref(getStored(STORAGE_KEYS.SELECTED_VIDEO_MODEL, DEFAULT_VIDEO_MODEL))

  // 当前令牌可用模型
  const allChatModels = computed(() =>
    resolveTokenModels(currentToken.value, 'chat', CHAT_MODELS)
  )

  const allImageModels = computed(() =>
    resolveTokenModels(currentToken.value, 'image', IMAGE_MODELS, IMAGE_CUSTOM_DEFAULTS)
  )

  const allVideoModels = computed(() =>
    resolveTokenModels(currentToken.value, 'video', VIDEO_MODELS, VIDEO_CUSTOM_DEFAULTS)
  )

  // ============ Computed: Available Models (filtered by provider) ============

  // 按渠道过滤的可用模型
  const availableChatModels = computed(() =>
    allChatModels.value.filter(m => isModelSupported(m, currentProvider.value))
  )

  const availableImageModels = computed(() =>
    allImageModels.value.filter(m => isModelSupported(m, currentProvider.value))
  )

  const availableVideoModels = computed(() =>
    allVideoModels.value.filter(m => isModelSupported(m, currentProvider.value))
  )

  // ============ Computed: Model Options for UI (all models, not filtered by provider) ============

  // 返回适合 n-dropdown 使用的选项格式（全部模型，不按渠道过滤）
  const allImageModelOptions = computed(() =>
    allImageModels.value.map(m => ({
      label: m.label,
      key: m.key
    }))
  )

  const allVideoModelOptions = computed(() =>
    allVideoModels.value.map(m => ({
      label: m.label,
      key: m.key
    }))
  )

  const allChatModelOptions = computed(() =>
    allChatModels.value.map(m => ({
      label: m.label,
      key: m.key
    }))
  )

  // ============ Computed: Model Options for UI (filtered by provider - deprecated, use all* instead) ============

  // 返回适合 n-dropdown 使用的选项格式
  const imageModelOptions = computed(() =>
    availableImageModels.value.map(m => ({
      label: m.label,
      key: m.key
    }))
  )

  const videoModelOptions = computed(() =>
    availableVideoModels.value.map(m => ({
      label: m.label,
      key: m.key
    }))
  )

  const chatModelOptions = computed(() =>
    availableChatModels.value.map(m => ({
      label: m.label,
      key: m.key
    }))
  )

  // ============ Methods: Add/Remove Custom Models ============

  const addCustomChatModel = (modelKey, label = '') => {
    const token = currentToken.value
    if (token) return addTokenCustomModel(token.id, 'chat', modelKey, label)
    if (!modelKey || customChatModels.value.some(m => m.key === modelKey)) return false
    customChatModels.value.push({ key: modelKey, label: label || modelKey })
    return true
  }

  const addCustomImageModel = (modelKey, label = '') => {
    const token = currentToken.value
    if (token) return addTokenCustomModel(token.id, 'image', modelKey, label)
    if (!modelKey || customImageModels.value.some(m => m.key === modelKey)) return false
    customImageModels.value.push({ key: modelKey, label: label || modelKey })
    return true
  }

  const addCustomVideoModel = (modelKey, label = '') => {
    const token = currentToken.value
    if (token) return addTokenCustomModel(token.id, 'video', modelKey, label)
    if (!modelKey || customVideoModels.value.some(m => m.key === modelKey)) return false
    customVideoModels.value.push({ key: modelKey, label: label || modelKey })
    return true
  }

  const removeCustomChatModel = (modelKey) => {
    const token = currentToken.value
    if (token) return removeTokenModel(token.id, 'chat', modelKey)
    const idx = customChatModels.value.findIndex(m => m.key === modelKey)
    if (idx > -1) {
      customChatModels.value.splice(idx, 1)
      if (selectedChatModel.value === modelKey) selectedChatModel.value = DEFAULT_CHAT_MODEL
      return true
    }
    return false
  }

  const removeCustomImageModel = (modelKey) => {
    const token = currentToken.value
    if (token) return removeTokenModel(token.id, 'image', modelKey)
    const idx = customImageModels.value.findIndex(m => m.key === modelKey)
    if (idx > -1) {
      customImageModels.value.splice(idx, 1)
      if (selectedImageModel.value === modelKey) selectedImageModel.value = DEFAULT_IMAGE_MODEL
      return true
    }
    return false
  }

  const removeCustomVideoModel = (modelKey) => {
    const token = currentToken.value
    if (token) return removeTokenModel(token.id, 'video', modelKey)
    const idx = customVideoModels.value.findIndex(m => m.key === modelKey)
    if (idx > -1) {
      customVideoModels.value.splice(idx, 1)
      if (selectedVideoModel.value === modelKey) selectedVideoModel.value = DEFAULT_VIDEO_MODEL
      return true
    }
    return false
  }

  // ============ Methods: Get Model Config ============

  const getChatModel = (key) => allChatModels.value.find(m => m.key === key)
  const getImageModel = (key) => allImageModels.value.find(m => m.key === key)
  const getVideoModel = (key) => allVideoModels.value.find(m => m.key === key)

  // ============ Methods: Get API Endpoints ============

  // 获取图片端点
  const getImageEndpoint = () => {
    const endpoint = providerConfig.value.endpoints?.image || '/images/generations'
    return `${currentBaseUrl.value}${endpoint}`
  }

  // 获取视频生成端点
  const getVideoEndpoint = () => {
    const endpoint = providerConfig.value.endpoints?.video || '/videos'
    return `${currentBaseUrl.value}${endpoint}`
  }

  // 获取视频任务查询端点
  const getVideoTaskEndpoint = () => {
    const config = providerConfig.value
    // 优先使用 videoQuery 端点，支持 {taskId} 占位符替换
    let endpoint = config.endpoints?.videoQuery || config.endpoints?.video || '/videos'
    return `${currentBaseUrl.value}${endpoint}`
  }

  // 获取聊天端点（支持参考图片）
  const getChatEndpoint = () => {
    const endpoint = providerConfig.value?.endpoints?.chat || '/chat/completions'
    return `${currentBaseUrl.value}${endpoint}`
  }

  // ============ Methods: Get Models By Provider (for ApiSettings) ============

  const getModelsByProvider = (provider) => {
    const chat = [
      ...CHAT_MODELS.filter(m => isModelSupported(m, provider)).map(m => ({ ...m, isCustom: false })),
      ...(customChatModelsByProvider.value[provider] || []).map(m => ({
        label: m.label || m.key,
        key: m.key,
        isCustom: true,
        provider: [provider]
      }))
    ]
    const image = [
      ...IMAGE_MODELS.filter(m => isModelSupported(m, provider)).map(m => ({ ...m, isCustom: false })),
      ...(customImageModelsByProvider.value[provider] || []).map(m => ({
        label: m.label || m.key,
        key: m.key,
        isCustom: true,
        sizes: [],
        defaultParams: { quality: 'standard', style: 'vivid' },
        provider: [provider]
      }))
    ]
    const video = [
      ...VIDEO_MODELS.filter(m => isModelSupported(m, provider)).map(m => ({ ...m, isCustom: false })),
      ...(customVideoModelsByProvider.value[provider] || []).map(m => ({
        label: m.label || m.key,
        key: m.key,
        isCustom: true,
        ratios: ['16x9', '9:16', '1:1'],
        durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
        defaultParams: { ratio: '16:9', duration: 5 },
        provider: [provider]
      }))
    ]
    return { chat, image, video }
  }

  // ============ Methods: Add/Remove Custom Models By Provider ============

  const addCustomChatModelByProvider = (modelKey, provider, label = '') => {
    if (!modelKey) return false
    if (!customChatModelsByProvider.value[provider]) {
      customChatModelsByProvider.value[provider] = []
    }
    if (customChatModelsByProvider.value[provider].some(m => m.key === modelKey)) return false
    customChatModelsByProvider.value[provider].push({ key: modelKey, label: label || modelKey })
    return true
  }

  const addCustomImageModelByProvider = (modelKey, provider, label = '') => {
    if (!modelKey) return false
    if (!customImageModelsByProvider.value[provider]) {
      customImageModelsByProvider.value[provider] = []
    }
    if (customImageModelsByProvider.value[provider].some(m => m.key === modelKey)) return false
    customImageModelsByProvider.value[provider].push({ key: modelKey, label: label || modelKey })
    return true
  }

  const addCustomVideoModelByProvider = (modelKey, provider, label = '') => {
    if (!modelKey) return false
    if (!customVideoModelsByProvider.value[provider]) {
      customVideoModelsByProvider.value[provider] = []
    }
    if (customVideoModelsByProvider.value[provider].some(m => m.key === modelKey)) return false
    customVideoModelsByProvider.value[provider].push({ key: modelKey, label: label || modelKey })
    return true
  }

  const removeCustomChatModelByProvider = (modelKey, provider) => {
    if (!customChatModelsByProvider.value[provider]) return false
    const idx = customChatModelsByProvider.value[provider].findIndex(m => m.key === modelKey)
    if (idx > -1) {
      customChatModelsByProvider.value[provider].splice(idx, 1)
      return true
    }
    return false
  }

  const removeCustomImageModelByProvider = (modelKey, provider) => {
    if (!customImageModelsByProvider.value[provider]) return false
    const idx = customImageModelsByProvider.value[provider].findIndex(m => m.key === modelKey)
    if (idx > -1) {
      customImageModelsByProvider.value[provider].splice(idx, 1)
      return true
    }
    return false
  }

  const removeCustomVideoModelByProvider = (modelKey, provider) => {
    if (!customVideoModelsByProvider.value[provider]) return false
    const idx = customVideoModelsByProvider.value[provider].findIndex(m => m.key === modelKey)
    if (idx > -1) {
      customVideoModelsByProvider.value[provider].splice(idx, 1)
      return true
    }
    return false
  }

  // 清除所有自定义模型
  const clearCustomModels = () => {
    customChatModels.value = []
    customImageModels.value = []
    customVideoModels.value = []
    selectedChatModel.value = DEFAULT_CHAT_MODEL
    selectedImageModel.value = DEFAULT_IMAGE_MODEL
    selectedVideoModel.value = DEFAULT_VIDEO_MODEL
  }

  // ============ Watch & Persist ============

  // 监听并持久化自定义模型
  watch(customChatModels, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_CHAT_MODELS, val), { deep: true })
  watch(customImageModels, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_IMAGE_MODELS, val), { deep: true })
  watch(customVideoModels, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_VIDEO_MODELS, val), { deep: true })

  // 监听并持久化按渠道的自定义模型
  watch(customChatModelsByProvider, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_CHAT_MODELS_BY_PROVIDER, val), { deep: true })
  watch(customImageModelsByProvider, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_IMAGE_MODELS_BY_PROVIDER, val), { deep: true })
  watch(customVideoModelsByProvider, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_VIDEO_MODELS_BY_PROVIDER, val), { deep: true })

  // 监听并持久化选中的模型
  watch(selectedChatModel, (val) => setStored(STORAGE_KEYS.SELECTED_CHAT_MODEL, val))
  watch(selectedImageModel, (val) => setStored(STORAGE_KEYS.SELECTED_IMAGE_MODEL, val))
  watch(selectedVideoModel, (val) => setStored(STORAGE_KEYS.SELECTED_VIDEO_MODEL, val))

  // 监听并持久化 API 令牌
  watch(apiTokens, (val) => setStoredJson(STORAGE_KEYS.API_TOKENS, val), { deep: true })
  watch(currentTokenId, (val) => setStored(STORAGE_KEYS.CURRENT_TOKEN_ID, val))

  return {
    // Provider
    currentProvider,
    providerList,
    providerConfig,
    providerLabel,
    setProvider,
    clearProvider,
    adaptRequest,
    adaptResponse,

    // All models (built-in + custom)
    allChatModels,
    allImageModels,
    allVideoModels,

    // Available models filtered by provider
    availableChatModels,
    availableImageModels,
    availableVideoModels,

    // Model options for UI (dropdown format)
    imageModelOptions,
    videoModelOptions,
    chatModelOptions,

    // All model options (not filtered by provider)
    allImageModelOptions,
    allVideoModelOptions,
    allChatModelOptions,

    // Selected models
    selectedChatModel,
    selectedImageModel,
    selectedVideoModel,

    // Custom models
    customChatModels,
    customImageModels,
    customVideoModels,

    // Custom models by provider
    customChatModelsByProvider,
    customImageModelsByProvider,
    customVideoModelsByProvider,

    // Add/Remove methods
    addCustomChatModel,
    addCustomImageModel,
    addCustomVideoModel,
    removeCustomChatModel,
    removeCustomImageModel,
    removeCustomVideoModel,

    // Add/Remove by provider methods
    addCustomChatModelByProvider,
    addCustomImageModelByProvider,
    addCustomVideoModelByProvider,
    removeCustomChatModelByProvider,
    removeCustomImageModelByProvider,
    removeCustomVideoModelByProvider,

    // Get model
    getChatModel,
    getImageModel,
    getVideoModel,

    // Get API endpoints
    getImageEndpoint,
    getVideoEndpoint,
    getVideoTaskEndpoint,
    getChatEndpoint,

    // Get models by provider (for ApiSettings)
    getModelsByProvider,

    // Clear all custom models
    clearCustomModels,

    // API Tokens
    apiTokens,
    currentTokenId,
    currentToken,
    isApiConfigured,
    setCurrentTokenId,
    addToken,
    updateToken,
    removeToken,
    isTokenModelEnabled,
    addTokenBuiltinModel,
    removeTokenModel,
    addTokenCustomModel,
    getNodeTokenModels,
    getNodeTokenModelOptions,
    builtinChatModels,
    builtinImageModels,
    builtinVideoModels,

    // API Config (legacy compat)
    currentApiKey,
    currentBaseUrl,
    apiKeysByProvider,
    baseUrlsByProvider,
    setApiKeyByProvider,
    setBaseUrlByProvider,
    clearApiConfigByProvider
  }
})
