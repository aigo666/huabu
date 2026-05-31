/**
 * HTTP Request Utility | HTTP 请求工具
 * Axios-based request with interceptors
 */

import axios from 'axios'
import { formatApiErrorMessage, logApiError, toApiError } from './apiError'
import { getCurrentTokenApiKey } from './apiTokens'

const pickBizMessage = (data) => {
  if (!data || typeof data !== 'object') return ''
  return data.message || data.msg || data.error?.message || ''
}

// Base URL from environment or default
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.xgapi.top'

// Create axios instance | 创建 axios 实例
const instance = axios.create({
  baseURL: "/",
  timeout: 30000000
})

// Request interceptor | 请求拦截器
instance.interceptors.request.use(
  (config) => {
    // Get API key from per-request override or current active token

    // Skip auth for certain endpoints | 跳过某些端点的认证
    const noAuthEndpoints = ['/model/page', '/model/fullName', '/model/types']
    const isNoAuth = noAuthEndpoints.some(ep => config.url?.includes(ep))

    const apiKey = config._tokenApiKey || getCurrentTokenApiKey()

    if (apiKey && !isNoAuth && !config.headers?.Authorization) {
      config.headers['Authorization'] = `Bearer ${apiKey}`
    }

    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor | 响应拦截器
instance.interceptors.response.use(
  (res) => {
    const { data, code, message } = res.data || {}
    
    // Handle stream response | 处理流响应
    if (res.config.responseType === 'stream') {
      return res.data
    }
    
    // Handle blob response | 处理 blob 响应
    if (res.data instanceof Blob) {
      return res.data
    }
    
    // Success response | 成功响应
    if (code === 200 || res.status === 200) {
      return res.data
    }
    
    // Error response | 错误响应
    const bizMessage = message || pickBizMessage(res.data)
    logApiError({ response: { status: res.status, statusText: res.statusText, data: res.data }, config: res.config }, 'HTTP')
    if (!res.config?._silentError) {
      window.$message?.error(bizMessage || 'Request failed')
    }
    return Promise.reject(new Error(bizMessage || `Request failed [${res.status}]`))
  },
  (error) => {
    const detailMessage = formatApiErrorMessage(error)
    const { response, config } = error

    if (!config?._silentError) {
      if (response?.status === 401) {
        window.$message?.error(detailMessage || 'API Key 无效或已过期')
      } else if (response?.status === 429) {
        window.$message?.error(detailMessage || '请求过于频繁，请稍后再试')
      } else {
        window.$message?.error(detailMessage || '请求失败')
      }
    }

    return Promise.reject(toApiError(error, 'HTTP'))
  }
)

/**
 * Set API base URL | 设置 API 基础 URL
 * @param {string} url - Base URL
 */
export const setBaseUrl = (url) => {
  instance.defaults.baseURL = url
}

/**
 * Get current base URL | 获取当前基础 URL
 * @returns {string}
 */
export const getBaseUrl = () => {
  return instance.defaults.baseURL
}

export default instance
