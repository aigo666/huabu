/**
 * Models Configuration | 模型配置
 * Centralized model configuration | 集中模型配置
 */

// Seedream image size options | 豆包图片尺寸选项
export const SEEDREAM_SIZE_OPTIONS = [
    { label: '21:9', key: '3024x1296' },
    { label: '16:9', key: '2560x1440' },
    { label: '4:3', key: '2304x1728' },
    { label: '3:2', key: '2496x1664' },
    { label: '1:1', key: '2048x2048' },
    { label: '2:3', key: '1664x2496' },
    { label: '3:4', key: '1728x2304' },
    { label: '9:16', key: '1440x2560' },
    { label: '9:21', key: '1296x3024' }
]

// Seedream 4K image size options | 豆包4K图片尺寸选项
export const SEEDREAM_4K_SIZE_OPTIONS = [
    { label: '21:9', key: '6198x2656' },
    { label: '16:9', key: '5404x3040' },
    { label: '4:3', key: '4694x3520' },
    { label: '3:2', key: '4992x3328' },
    { label: '1:1', key: '4096x4096' },
    { label: '2:3', key: '3328x4992' },
    { label: '3:4', key: '3520x4694' },
    { label: '9:16', key: '3040x5404' },
    { label: '9:21', key: '2656x6198' }
]

// Seedream quality options | 豆包画质选项
export const SEEDREAM_QUALITY_OPTIONS = [
    { label: '标准画质', key: 'standard' },
    { label: '4K 高清', key: '4k' }
]

export const BANANA_SIZE_OPTIONS = [
    { label: 'Auto', key: 'auto' },
    { label: '16:9', key: '16x9' },
    { label: '4:3', key: '4x3' },
    { label: '3:2', key: '3x2' },
    { label: '1:1', key: '1x1' },
    { label: '2:3', key: '2x3' },
    { label: '3:4', key: '3x4' },
    { label: '9:16', key: '9x16' },
]

// Banana 分辨率选项 | Gemini 绘图 image_size
export const BANANA_RESOLUTION_OPTIONS = [
    { label: '1K', key: '1K' },
    { label: '2K', key: '2K' },
    { label: '4K', key: '4K' },
]

export const BANANA_CHAT_IMAGE_MODELS = ['nano-banana-2', 'nano-banana-pro']

export const isBananaChatImageModel = (modelKey) => BANANA_CHAT_IMAGE_MODELS.includes(modelKey)

// GPT Image 尺寸选项 | gpt-image-2 size
export const GPT_IMAGE_SIZE_OPTIONS = [
    { label: 'Auto（默认）', key: 'auto' },
    { label: '1024×1024 正方形', key: '1024x1024' },
    { label: '1536×1024 横版', key: '1536x1024' },
    { label: '1024×1536 竖版', key: '1024x1536' },
    { label: '2048×2048 2K正方形', key: '2048x2048' },
    { label: '2048×1152 2K横版', key: '2048x1152' },
    { label: '3840×2160 4K横版', key: '3840x2160' },
    { label: '2160×3840 4K竖版', key: '2160x3840' },
]

// GPT Image 画质选项 | gpt-image-2 quality
export const GPT_IMAGE_QUALITY_OPTIONS = [
    { label: 'Auto（默认）', key: 'auto' },
    { label: 'Low', key: 'low' },
    { label: 'Medium', key: 'medium' },
    { label: 'High', key: 'high' },
]

export const GPT_IMAGE_MODELS = ['gpt-image-2']

export const isGptImageModel = (modelKey) => GPT_IMAGE_MODELS.includes(modelKey)

export const hasIndependentQualitySize = (config) =>
    config?.imageApi === 'chat-completions' || config?.imageApi === 'openai-generations'

const SEEDREAM_IMAGE_CONFIG = {
    provider: ['chatfire'],
    imageApi: 'seedream-generations',
    sizes: SEEDREAM_SIZE_OPTIONS.map(s => s.key),
    qualities: SEEDREAM_QUALITY_OPTIONS,
    getSizesByQuality: (quality) => quality === '4k' ? SEEDREAM_4K_SIZE_OPTIONS : SEEDREAM_SIZE_OPTIONS,
    defaultParams: {
        size: '2048x2048',
        quality: 'standard',
        style: 'vivid'
    }
}

// Image generation models | 图片生成模型
export const IMAGE_MODELS = [
    {
        label: 'GPT Image 2',
        key: 'gpt-image-2',
        apiModel: 'gpt-image-2',
        provider: ['chatfire', 'openai'],
        imageApi: 'openai-generations',
        sizeOptions: GPT_IMAGE_SIZE_OPTIONS,
        sizes: GPT_IMAGE_SIZE_OPTIONS.map(s => s.key),
        qualities: GPT_IMAGE_QUALITY_OPTIONS,
        defaultParams: {
            size: 'auto',
            quality: 'auto',
            response_format: 'url',
            output_format: 'png',
            background: 'auto',
            moderation: 'auto',
            n: 1,
        }
    },
    {
        label: 'Nano Banana 2',
        key: 'nano-banana-2',
        apiModel: 'gemini-3.1-flash-image-preview',
        provider: ['chatfire'],
        imageApi: 'chat-completions',
        sizeOptions: BANANA_SIZE_OPTIONS,
        sizes: BANANA_SIZE_OPTIONS.map(s => s.key),
        qualities: BANANA_RESOLUTION_OPTIONS,
        defaultParams: {
            size: '1x1',
            quality: '1K',
        }
    },
    {
        label: 'Nano Banana Pro',
        key: 'nano-banana-pro',
        apiModel: 'gemini-3-pro-image-preview',
        provider: ['chatfire'],
        imageApi: 'chat-completions',
        sizeOptions: BANANA_SIZE_OPTIONS,
        sizes: BANANA_SIZE_OPTIONS.map(s => s.key),
        qualities: BANANA_RESOLUTION_OPTIONS,
        defaultParams: {
            size: '1x1',
            quality: '1K',
        }
    },
    {
        label: '豆包 Seedream 4.5',
        key: 'doubao-seedream-4-5-251128',
        apiModel: 'jimeng-4.5',
        ...SEEDREAM_IMAGE_CONFIG,
    },
    {
        label: '豆包 Seedream 4.6',
        key: 'seedream-4.6',
        apiModel: 'seedream-4.6',
        ...SEEDREAM_IMAGE_CONFIG,
    },
    {
        label: '豆包 Seedream 4.7',
        key: 'seedream-4.7',
        apiModel: 'seedream-4.7',
        ...SEEDREAM_IMAGE_CONFIG,
    },
    {
        label: '豆包 Seedream 5.0',
        key: 'seedream-5.0',
        apiModel: 'seedream-5.0',
        ...SEEDREAM_IMAGE_CONFIG,
    },

]

// Video ratio options | 视频比例选项
export const VIDEO_RATIO_LIST = [
    { label: '16:9 (横版)', key: '16:9' },
    { label: '4:3', key: '4:3' },
    { label: '1:1 (方形)', key: '1:1' },
    { label: '3:4', key: '3:4' },
    { label: '9:16 (竖版)', key: '9:16' }
]

// Veo 分辨率选项
export const VEO_VIDEO_RESOLUTION_OPTIONS = [
    { label: '480p', key: '480p' },
    { label: '720p', key: '720p' },
    { label: '1080p', key: '1080p' },
    { label: '4K', key: '4k' },
]

export const VEO_DURATION_OPTIONS = [
    { label: '4 秒', key: 4 },
    { label: '6 秒', key: 6 },
    { label: '8 秒', key: 8 },
]

export const VEO_4K_DURATION_OPTIONS = [{ label: '8 秒', key: 8 }]

// Sora 2 尺寸选项（固定 720p，不可选分辨率档位）
export const SORA_VIDEO_SIZE_OPTIONS = [
    { label: '1280×720 横版', key: '1280x720' },
    { label: '720×1280 竖版', key: '720x1280' },
]

export const SORA_DURATION_OPTIONS = [
    { label: '4 秒', key: 4 },
    { label: '8 秒', key: 8 },
    { label: '12 秒', key: 12 },
]

const VEO_VIDEO_CONFIG = {
    provider: ['chatfire'],
    videoApi: 'veo-videos',
    ratios: ['16:9'],
    resolutions: VEO_VIDEO_RESOLUTION_OPTIONS.map((r) => r.key),
    resolutionOptions: VEO_VIDEO_RESOLUTION_OPTIONS,
    getDurationsByResolution: (resolution) =>
        resolution === '4k' ? VEO_4K_DURATION_OPTIONS : VEO_DURATION_OPTIONS,
    defaultParams: { ratio: '16:9', duration: 8, resolution: '720p' },
    async: true,
}

export const SEEDANCE_2_RESOLUTION_OPTIONS = [
    { label: '480p', key: '480p' },
    { label: '720p', key: '720p' },
]

export const SEEDANCE_2_DURATION_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 4} 秒`,
    key: i + 4,
}))

const SEEDANCE_2_VIDEO_CONFIG = {
    provider: ['chatfire'],
    videoApi: 'seedance2-generations',
    ratios: ['16:9', '9:16', '1:1'],
    resolutions: SEEDANCE_2_RESOLUTION_OPTIONS.map((r) => r.key),
    resolutionOptions: SEEDANCE_2_RESOLUTION_OPTIONS,
    durs: SEEDANCE_2_DURATION_OPTIONS,
    defaultParams: { ratio: '16:9', duration: 5, resolution: '720p' },
    async: true,
}

const SORA_VIDEO_CONFIG = {
    provider: ['chatfire'],
    videoApi: 'sora-videos',
    supportsFirstLastFrame: false,
    imageRoles: ['input_reference'],
    sizeOptions: SORA_VIDEO_SIZE_OPTIONS,
    sizes: SORA_VIDEO_SIZE_OPTIONS.map((s) => s.key),
    durs: SORA_DURATION_OPTIONS,
    defaultParams: { size: '1280x720', duration: 8 },
    async: true,
}

// Video resolution options for Seedance | Seedance 分辨率选项（兼容自定义模型）
export const SEEDANCE_RESOLUTION_OPTIONS = [
    { label: '480p', key: '480p' },
    { label: '720p', key: '720p' },
    { label: '1080p', key: '1080p' }
]

// Video generation models | 视频生成模型
export const VIDEO_MODELS = [
    {
        label: 'Veo 3.1 Generate Preview',
        key: 'veo-3.1-generate-preview',
        ...VEO_VIDEO_CONFIG,
    },
    {
        label: 'Veo 3.1 Fast Generate Preview',
        key: 'veo-3.1-fast-generate-preview',
        ...VEO_VIDEO_CONFIG,
    },
    {
        label: 'Sora 2',
        key: 'sora-2',
        ...SORA_VIDEO_CONFIG,
    },
    {
        label: 'Seedance 2.0 Fast',
        key: 'doubao-seedance-2-0-fast-260128',
        ...SEEDANCE_2_VIDEO_CONFIG,
    },
    {
        label: 'Seedance 2.0',
        key: 'doubao-seedance-2-0-260128',
        ...SEEDANCE_2_VIDEO_CONFIG,
    },
]

// Chat/LLM models | 对话模型
export const CHAT_MODELS = [
    { label: 'Gemini 3.1 Pro Preview', key: 'gemini-3.1-pro-preview', provider: ['openai', 'chatfire'] },
    { label: 'Gemini 3 Pro Preview', key: 'gemini-3-pro-preview', provider: ['openai', 'chatfire'] },
    { label: 'GPT-5.5', key: 'gpt-5.5', provider: ['openai'] },
    { label: 'GPT-5.4 Mini', key: 'gpt-5.4-mini', provider: ['openai'] },
    { label: 'DeepSeek V4 Flash', key: 'deepseek-v4-flash', provider: ['openai', 'chatfire'] },
    { label: 'DeepSeek V4 Pro', key: 'deepseek-v4-pro', provider: ['openai', 'chatfire'] },
    { label: 'GPT-4o Mini', key: 'gpt-4o-mini', provider: ['openai'] },
]

// Image size options | 图片尺寸选项
export const IMAGE_SIZE_OPTIONS = [
    { label: '2048x2048', key: '2048x2048' },
    { label: '1792x1024 (横版)', key: '1792x1024' },
    { label: '1024x1792 (竖版)', key: '1024x1792' }
]

// Image quality options | 图片质量选项
export const IMAGE_QUALITY_OPTIONS = [
    { label: '标准', key: 'standard' },
    { label: '高清', key: 'hd' }
]

// Image style options | 图片风格选项
export const IMAGE_STYLE_OPTIONS = [
    { label: '生动', key: 'vivid' },
    { label: '自然', key: 'natural' }
]

// Video ratio options | 视频比例选项
export const VIDEO_RATIO_OPTIONS = VIDEO_RATIO_LIST

// Video duration options | 视频时长选项
export const VIDEO_DURATION_OPTIONS = [
    { label: '5 秒', key: 5 },
    { label: '10 秒', key: 10 }
]

// Default values | 默认值
export const DEFAULT_IMAGE_MODEL = 'nano-banana-pro'
export const DEFAULT_VIDEO_MODEL = 'veo-3.1-generate-preview'
export const DEFAULT_CHAT_MODEL = 'gpt-4o-mini'
export const DEFAULT_IMAGE_SIZE = '2048x2048'
export const DEFAULT_VIDEO_RATIO = '16:9'
export const DEFAULT_VIDEO_DURATION = 5

// Get model by key | 根据 key 获取模型
export const getModelByName = (key) => {
    const allModels = [...IMAGE_MODELS, ...VIDEO_MODELS, ...CHAT_MODELS]
    return allModels.find(m => m.key === key)
}
