/**
 * API 错误详情提取与打印
 */

const pickResponseDetail = (data) => {
  if (!data) return ''
  if (typeof data === 'string') return data.trim()

  const candidates = [
    data?.error?.message,
    data?.error?.msg,
    typeof data?.error === 'string' ? data.error : null,
    data?.message,
    data?.msg,
    data?.detail,
    data?.reason
  ]

  for (const item of candidates) {
    if (item && typeof item === 'string' && item.trim()) {
      return item.trim()
    }
  }

  if (data?.error && typeof data.error === 'object') {
    try {
      return JSON.stringify(data.error)
    } catch {
      return ''
    }
  }

  if (typeof data === 'object') {
    try {
      return JSON.stringify(data)
    } catch {
      return ''
    }
  }

  return ''
}

/** 格式化 API 错误为可读文本 */
export const formatApiErrorMessage = (error) => {
  const { response, message } = error || {}

  if (!response) {
    return message || '网络错误'
  }

  const { status, statusText, data } = response
  const statusLabel = `[${status}${statusText ? ` ${statusText}` : ''}]`
  const detail = pickResponseDetail(data)

  if (detail) {
    return `${statusLabel} ${detail}`
  }

  return `${statusLabel} ${message || '请求失败'}`
}

/** 控制台打印完整错误信息 */
export const logApiError = (error, label = 'API') => {
  const { response, config, message } = error || {}

  console.group(`❌ [${label}] 请求失败`)
  if (config) {
    console.error('Method:', config.method?.toUpperCase())
    console.error('URL:', config.url)
    if (config.data) {
      try {
        console.error('Request Body:', typeof config.data === 'string' ? JSON.parse(config.data) : config.data)
      } catch {
        console.error('Request Body:', config.data)
      }
    }
  }
  if (response) {
    console.error('Status:', response.status, response.statusText)
    console.error('Response Data:', response.data)
  } else {
    console.error('Message:', message)
  }
  console.groupEnd()
}

/** 包装为带详情的 Error，便于 UI 展示 */
export const toApiError = (error, label = 'API') => {
  logApiError(error, label)
  const detailMessage = formatApiErrorMessage(error)
  const enrichedError = new Error(detailMessage)
  enrichedError.cause = error
  enrichedError.response = error?.response
  return enrichedError
}
