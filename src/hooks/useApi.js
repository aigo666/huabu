/**
 * API Hooks | API Hooks
 * Simplified hooks for open source version | 开源版简化 hooks
 */

import { ref, reactive, onUnmounted } from 'vue'
import {
  generateImage,
  createVideoTask,
  getVideoTaskStatus,
  streamChatCompletions,
  chatCompletions
} from '@/api'
import { getModelByName } from '@/config/models'
import { useApiConfig } from './useApiConfig'
import { useProvider } from './useProvider'
import {
  isBananaChatImageModel,
  buildBananaChatImageRequest,
  parseBananaChatImageResponse
} from '@/utils/bananaImage'
import {
  isSeedreamImageModel,
  buildSeedreamPrompt
} from '@/utils/seedreamImage'
import { isVeoVideoModel, buildVeoVideoFormData, buildVeoTextVideoRequest, veoNeedsMultipart } from '@/utils/veoVideo'
import { isSoraVideoModel, buildSoraVideoFormData, buildSoraTextVideoRequest } from '@/utils/soraVideo'
import {
  executeWithModelTokens,
  adaptRequestForToken,
  adaptResponseForToken,
  getTokenEndpoints,
  getVideoEndpointsForModel,
  getTokenById,
  withTokenRequest
} from '@/utils/tokenRequest'
import { isSeedance2VideoModel, buildSeedance2VideoRequest } from '@/utils/seedance2Video'

/**
 * Base API state hook | 基础 API 状态 Hook
 */
export const useApiState = () => {
  const loading = ref(false)
  const error = ref(null)
  const status = ref('idle')

  const reset = () => {
    loading.value = false
    error.value = null
    status.value = 'idle'
  }

  const setLoading = (isLoading) => {
    loading.value = isLoading
    status.value = isLoading ? 'running' : status.value
  }

  const setError = (err) => {
    error.value = err
    status.value = 'error'
    loading.value = false
  }

  const setSuccess = () => {
    status.value = 'success'
    loading.value = false
    error.value = null
  }

  return { loading, error, status, reset, setLoading, setError, setSuccess }
}

/**
 * Chat composable | 问答组合式函数
 */
export const useChat = (options = {}) => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()
  const { adaptRequest } = useProvider()

  const messages = ref([])
  const currentResponse = ref('')
  let abortController = null

  const send = async (content, stream = true, chatOptions = {}) => {
    setLoading(true)
    currentResponse.value = ''

    try {
      // 构建用户消息内容（支持参考图片）
      let userContent
      const images = chatOptions.images || options.images || []

      if (images.length > 0) {
        // 多模态消息：文本 + 图片
        userContent = [
          { type: 'text', text: content },
          ...images.map(img => ({
            type: 'image_url',
            image_url: { url: img.url || img }
          }))
        ]
      } else {
        userContent = content
      }

      const msgList = [
        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        ...messages.value,
        { role: 'user', content: userContent }
      ]

      const modelKey = chatOptions.model ?? options.model ?? 'gpt-4o-mini'
      const tokenId = chatOptions.tokenId ?? options.tokenId
      const adaptedParams = adaptRequest('chat', {
        model: modelKey,
        messages: msgList
      })

      if (stream) {
        status.value = 'streaming'
        abortController = new AbortController()
        let fullResponse = ''

        const { result } = await executeWithModelTokens({
          modelKey,
          type: 'chat',
          tokenId,
          requestFn: async (token) => {
            const endpoints = getTokenEndpoints(token)
            const url = new URL(endpoints.chat)
            let collected = ''
            for await (const chunk of streamChatCompletions(
              adaptRequestForToken(token, 'chat', adaptedParams),
              abortController.signal,
              {
                apiKey: token.apiKey,
                baseUrl: url.origin,
                endpoint: url.pathname
              }
            )) {
              collected += chunk
              currentResponse.value = collected
            }
            return collected
          }
        })

        fullResponse = result
        messages.value.push({ role: 'user', content })
        messages.value.push({ role: 'assistant', content: fullResponse })
        setSuccess()
        return fullResponse
      }

      const { result } = await executeWithModelTokens({
        modelKey,
        type: 'chat',
        tokenId,
        requestFn: async (token) => {
          const endpoints = getTokenEndpoints(token)
          const response = await chatCompletions(
            adaptRequestForToken(token, 'chat', adaptedParams),
            {
              ...withTokenRequest(token),
              endpoint: endpoints.chat
            }
          )
          return response?.choices?.[0]?.message?.content || ''
        }
      })

      messages.value.push({ role: 'user', content })
      messages.value.push({ role: 'assistant', content: result })
      currentResponse.value = result
      setSuccess()
      return result
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err)
        throw err
      }
    }
  }

  const stop = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  const clear = () => {
    messages.value = []
    currentResponse.value = ''
    reset()
  }

  onUnmounted(() => stop())

  return { loading, error, status, messages, currentResponse, send, stop, clear, reset }
}

/**
 * Image generation composable | 图片生成组合式函数
 * Simplified for open source - fixed input/output format
 */
export const useImageGeneration = () => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()

  const images = ref([])
  const currentImage = ref(null)

  const generate = async (params) => {
    setLoading(true)
    images.value = []
    currentImage.value = null

    try {
      const modelConfig = getModelByName(params.model)
      const modelKey = params.model

      const { result: adaptedData } = await executeWithModelTokens({
        modelKey,
        type: 'image',
        tokenId: params.tokenId,
        requestFn: async (token) => {
          const endpoints = getTokenEndpoints(token)
          const reqOpts = withTokenRequest(token, { requestType: 'json' })

          if (isBananaChatImageModel(modelKey)) {
            const requestBody = buildBananaChatImageRequest({
              model: modelKey,
              apiModel: modelConfig?.apiModel,
              prompt: params.prompt,
              size: params.size || modelConfig?.defaultParams?.size || '1x1',
              quality: params.quality || modelConfig?.defaultParams?.quality || '1K',
              images: params.image
            })
            const response = await chatCompletions(requestBody, {
              ...reqOpts,
              endpoint: endpoints.chat
            })
            const parsed = parseBananaChatImageResponse(response)
            if (!parsed.length) throw new Error('未从响应中解析到图片 URL')
            return parsed
          }

          if (isSeedreamImageModel(modelConfig)) {
            const quality = params.quality || modelConfig?.defaultParams?.quality || 'standard'
            const size = params.size || modelConfig?.defaultParams?.size || '2048x2048'
            const requestData = {
              model: modelConfig?.apiModel || modelKey,
              prompt: buildSeedreamPrompt(params.prompt, quality, size)
            }
            if (params.image) requestData.image = params.image

            const adaptedParams = adaptRequestForToken(token, 'image', requestData)
            const response = await generateImage(adaptedParams, {
              ...reqOpts,
              endpoint: endpoints.image
            })
            return adaptResponseForToken(token, 'image', response)
          }

          const requestData = {
            ...(modelConfig?.defaultParams || {}),
            model: modelConfig?.apiModel || modelKey,
            prompt: params.prompt,
            size: params.size || modelConfig?.defaultParams?.size || '2048x2048',
            quality: params.quality ?? modelConfig?.defaultParams?.quality,
            n: params.n ?? modelConfig?.defaultParams?.n ?? 1,
          }
          if (params.image) requestData.image = params.image

          const adaptedParams = adaptRequestForToken(token, 'image', requestData)
          const response = await generateImage(adaptedParams, {
            ...reqOpts,
            endpoint: endpoints.image
          })
          return adaptResponseForToken(token, 'image', response)
        }
      })

      images.value = adaptedData
      currentImage.value = adaptedData[0] || null
      setSuccess()
      return adaptedData
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return { loading, error, status, images, currentImage, generate, reset }
}

/**
 * Video generation composable | 视频生成组合式函数
 * Simplified for open source - fixed input/output format
 */

export const useVideoGeneration = () => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()

  const video = ref(null)
  const taskId = ref(null)
  const progress = reactive({
    attempt: 0,
    maxAttempts: 120,
    percentage: 0
  })

  const createVideoTaskOnly = async (params) => {
    const modelConfig = getModelByName(params.model)
    const modelKey = params.model

    const { result } = await executeWithModelTokens({
      modelKey,
      type: 'video',
      tokenId: params.tokenId,
      requestFn: async (token) => {
        const endpoints = getVideoEndpointsForModel(token, modelKey)

        if (isSeedance2VideoModel(modelKey)) {
          const hasImages =
            params.first_frame_image ||
            params.last_frame_image ||
            (params.images?.length > 0)

          if (!params.prompt && !hasImages) {
            throw new Error('请连接提示词或图片节点')
          }

          const requestBody = buildSeedance2VideoRequest({
            modelKey,
            resolution: params.resolution || modelConfig?.defaultParams?.resolution || '720p',
            prompt: params.prompt || '',
            duration: params.dur ?? modelConfig?.defaultParams?.duration ?? 5,
            aspectRatio: params.ratio || modelConfig?.defaultParams?.ratio || '16:9',
            first_frame_image: params.first_frame_image,
            last_frame_image: params.last_frame_image,
            reference_images: params.images || [],
          })

          const task = await createVideoTask(requestBody, {
            ...withTokenRequest(token, { requestType: 'json' }),
            endpoint: endpoints.video,
          })

          const isAsync = modelConfig?.async !== false
          if (!isAsync || task.data?.url || task.url || task.content?.video_url) {
            return {
              taskId: null,
              url: task.data?.url || task.url || task.content?.video_url,
              tokenId: token.id,
            }
          }

          const newTaskId = task.id || task.task_id || task.taskId
          if (!newTaskId) throw new Error('未获取到任务 ID')
          return { taskId: newTaskId, tokenId: token.id }
        }

        if (isVeoVideoModel(modelKey)) {
          const veoBase = {
            model: modelKey,
            prompt: params.prompt || '',
            duration: params.dur ?? modelConfig?.defaultParams?.duration ?? 8,
            resolution: params.resolution || modelConfig?.defaultParams?.resolution || '720p',
            aspectRatio: params.ratio || modelConfig?.defaultParams?.ratio || '16:9',
            first_frame_image: params.first_frame_image,
            last_frame_image: params.last_frame_image,
            reference_images: params.images || [],
          }

          const hasImages = veoNeedsMultipart(veoBase)
          let task

          if (hasImages) {
            task = await createVideoTask(
              await buildVeoVideoFormData({
                ...veoBase,
                seconds: veoBase.duration,
              }),
              {
                ...withTokenRequest(token, { requestType: 'formdata' }),
                endpoint: endpoints.video,
              }
            )
          } else {
            if (!veoBase.prompt) throw new Error('文生视频需要提示词')
            task = await createVideoTask(buildVeoTextVideoRequest(veoBase), {
              ...withTokenRequest(token, { requestType: 'json' }),
              endpoint: endpoints.video,
            })
          }

          const isAsync = modelConfig?.async !== false
          if (!isAsync || task.data?.url || task.url || task.content?.video_url) {
            return {
              taskId: null,
              url: task.data?.url || task.url || task.content?.video_url,
              tokenId: token.id,
            }
          }

          const newTaskId = task.id || task.task_id || task.taskId
          if (!newTaskId) throw new Error('未获取到任务 ID')
          return { taskId: newTaskId, tokenId: token.id }
        }

        if (isSoraVideoModel(modelKey)) {
          if (!params.prompt) throw new Error('Sora 2 需要提示词')

          const soraParams = {
            prompt: params.prompt,
            duration: params.dur ?? modelConfig?.defaultParams?.duration ?? 8,
            size: params.size || modelConfig?.defaultParams?.size || '1280x720',
            input_reference: params.input_reference,
          }

          let task
          if (soraParams.input_reference) {
            task = await createVideoTask(await buildSoraVideoFormData(soraParams), {
              ...withTokenRequest(token, { requestType: 'formdata' }),
              endpoint: endpoints.video,
            })
          } else {
            task = await createVideoTask(buildSoraTextVideoRequest(soraParams), {
              ...withTokenRequest(token, { requestType: 'json' }),
              endpoint: endpoints.video,
            })
          }

          const isAsync = modelConfig?.async !== false
          if (!isAsync || task.data?.url || task.url || task.content?.video_url) {
            return {
              taskId: null,
              url: task.data?.url || task.url || task.content?.video_url,
              tokenId: token.id,
            }
          }

          const newTaskId = task.id || task.task_id || task.taskId
          if (!newTaskId) throw new Error('未获取到任务 ID')
          return { taskId: newTaskId, tokenId: token.id }
        }

        const requestData = {
          model: modelKey,
          prompt: params.prompt || ''
        }
        if (params.first_frame_image) requestData.first_frame_image = params.first_frame_image
        if (params.last_frame_image) requestData.last_frame_image = params.last_frame_image
        if (params.ratio) requestData.size = params.ratio
        if (params.resolution) requestData.resolution = params.resolution
        if (params.dur) requestData.seconds = params.dur
        if (params.images?.length) requestData.reference_images = params.images

        const adaptedParams = adaptRequestForToken(token, 'video', requestData)
        const task = await createVideoTask(adaptedParams, {
          ...withTokenRequest(token, { requestType: 'json' }),
          endpoint: endpoints.video
        })

        const isAsync = modelConfig?.async !== false
        if (!isAsync || task.data?.url || task.url || task.content?.video_url) {
          return {
            taskId: null,
            url: task.data?.url || task.url || task.content?.video_url,
            tokenId: token.id
          }
        }

        const newTaskId = task.id || task.task_id || task.taskId
        if (!newTaskId) throw new Error('未获取到任务 ID')
        return { taskId: newTaskId, tokenId: token.id }
      }
    })

    return result
  }

  const pollVideoTask = async (pollTaskId, options = {}, onProgress = () => {}) => {
    const maxAttempts = 120
    const interval = 5000
    const token = options.tokenId ? getTokenById(options.tokenId) : options.token

    if (!token?.apiKey) {
      throw new Error('无法轮询视频任务：缺少对应令牌信息')
    }

    const endpoints = options.model
      ? getVideoEndpointsForModel(token, options.model)
      : getTokenEndpoints(token)
    let taskEndpoint = endpoints.videoQuery
    if (taskEndpoint.includes('{taskId}')) {
      taskEndpoint = taskEndpoint.replace('{taskId}', pollTaskId)
    }

    const reqOpts = withTokenRequest(token)

    for (let i = 0; i < maxAttempts; i++) {
      onProgress(i + 1, Math.min(Math.round((i / maxAttempts) * 100), 99))

      const result = await getVideoTaskStatus(pollTaskId, {
        ...reqOpts,
        endpoint: taskEndpoint
      })

      const adaptedResult = adaptResponseForToken(token, 'video', result)

      if (result.status === 'completed' || result.status === 'succeeded' || result.data) {
        const videoUrl = adaptedResult.url || result.data?.url || result.data?.[0]?.url || result.url || result.content?.video_url || result.video_url || result.output?.url
        return { ...adaptedResult, url: videoUrl, tokenId: token.id }
      }

      if (result.status === 'failed' || result.status === 'error') {
        throw new Error(result.error?.message || result.message || '视频生成失败')
      }

      await new Promise((resolve) => setTimeout(resolve, interval))
    }

    throw new Error('视频生成超时')
  }

  const generate = async (params) => {
    setLoading(true)
    video.value = null
    taskId.value = null
    progress.attempt = 0
    progress.percentage = 0

    try {
      const createResult = await createVideoTaskOnly(params)

      if (createResult.url) {
        video.value = { url: createResult.url }
        setSuccess()
        return video.value
      }

      taskId.value = createResult.taskId
      status.value = 'polling'

      const result = await pollVideoTask(
        createResult.taskId,
        { tokenId: createResult.tokenId, model: params.model },
        (attempt, percentage) => {
          progress.attempt = attempt
          progress.percentage = percentage
        }
      )

      video.value = result
      setSuccess()
      return result
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return { loading, error, status, video, taskId, progress, generate, reset, createVideoTaskOnly, pollVideoTask }
}

/**
 * Combined API composable | 综合 API 组合式函数
 */
export const useApi = () => {
  const config = useApiConfig()
  const chat = useChat()
  const image = useImageGeneration()
  const videoGen = useVideoGeneration()

  return { config, chat, image, video: videoGen }
}
