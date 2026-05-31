/**
 * Image API | 图片生成 API
 */

import { request } from '@/utils'

// 生成图片
export const generateImage = (data, options = {}) => {
  const { requestType = 'json', endpoint = '/images/generations', apiKey, silentError } = options

  return request({
    url: endpoint,
    method: 'post',
    data,
    _tokenApiKey: apiKey,
    _silentError: silentError,
    headers: requestType === 'formdata' ? { 'Content-Type': 'multipart/form-data' } : {}
  })
}
