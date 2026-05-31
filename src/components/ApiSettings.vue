<template>
  <n-modal v-model:show="showModal" preset="card" title="API 设置" style="width: 780px;">
    <div class="token-settings">
      <!-- 当前使用令牌 -->
      <div class="token-toolbar">
        <div class="flex items-center gap-3 flex-1">
          <span class="text-sm text-[var(--text-secondary)] shrink-0">当前令牌</span>
          <n-select
            v-model:value="activeTokenId"
            :options="tokenSelectOptions"
            placeholder="选择令牌"
            class="flex-1"
          />
        </div>
        <n-button type="primary" secondary @click="handleAddToken">+ 添加令牌</n-button>
      </div>

      <n-empty v-if="!editingToken" description="请先添加 API 令牌" class="my-8" />

      <template v-else>
        <!-- 令牌基本信息 -->
        <n-form label-placement="left" label-width="88" class="token-form">
          <n-form-item label="令牌名称">
            <n-input v-model:value="editingToken.name" placeholder="如：主账号、测试号" />
          </n-form-item>
          <n-form-item label="API Key">
            <n-input
              v-model:value="editingToken.apiKey"
              type="password"
              show-password-on="click"
              placeholder="请输入 API Key"
            />
          </n-form-item>
          <n-form-item label="渠道">
            <n-input value="星光 API" disabled />
          </n-form-item>
          <n-form-item label="线路">
            <n-select
              v-model:value="editingToken.baseUrl"
              :options="baseUrlOptions"
              placeholder="选择 API 线路"
            />
          </n-form-item>
        </n-form>

        <n-divider />

        <!-- 可用模型配置 -->
        <div class="model-section">
          <div class="section-title">可用模型</div>
          <p class="section-desc">从内置模型中添加，或自定义模型名。画布中仅显示当前令牌已启用的模型。</p>

          <ModelTokenPanel
            title="问答模型"
            tag-type="info"
            :builtin-models="modelStore.builtinChatModels"
            :enabled-keys="editingToken.models.chat"
            :custom-input="newChatModel"
            @update:custom-input="newChatModel = $event"
            @toggle="(key) => toggleBuiltinModel('chat', key)"
            @remove="(key) => removeModel('chat', key)"
            @add-custom="() => addCustomModel('chat')"
          />

          <ModelTokenPanel
            title="图片模型"
            tag-type="success"
            :builtin-models="modelStore.builtinImageModels"
            :enabled-keys="editingToken.models.image"
            :custom-input="newImageModel"
            @update:custom-input="newImageModel = $event"
            @toggle="(key) => toggleBuiltinModel('image', key)"
            @remove="(key) => removeModel('image', key)"
            @add-custom="() => addCustomModel('image')"
          />

          <ModelTokenPanel
            title="视频模型"
            tag-type="warning"
            :builtin-models="modelStore.builtinVideoModels"
            :enabled-keys="editingToken.models.video"
            :custom-input="newVideoModel"
            @update:custom-input="newVideoModel = $event"
            @toggle="(key) => toggleBuiltinModel('video', key)"
            @remove="(key) => removeModel('video', key)"
            @add-custom="() => addCustomModel('video')"
          />
        </div>

        <n-alert v-if="!editingToken.apiKey" type="warning" title="未配置 API Key" class="mt-4">
          请填写 API Key 后才能调用 AI 功能
        </n-alert>
        <n-alert v-else-if="totalEnabledModels === 0" type="warning" title="未配置可用模型" class="mt-4">
          请至少为该令牌添加一个可用模型
        </n-alert>
        <n-alert v-else type="success" title="已就绪" class="mt-4">
          当前令牌已配置 {{ totalEnabledModels }} 个可用模型
        </n-alert>
      </template>
    </div>

    <template #footer>
      <div class="flex justify-between items-center w-full">
        <n-button
          v-if="editingToken"
          type="error"
          tertiary
          @click="handleDeleteToken"
        >
          删除此令牌
        </n-button>
        <span v-else />
        <div class="flex gap-2">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" @click="handleSave">保存</n-button>
        </div>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  NModal, NForm, NFormItem, NInput, NButton, NAlert,
  NDivider, NSelect, NEmpty, useDialog, useMessage
} from 'naive-ui'
import { useModelStore } from '../stores/pinia'
import {
  XGAPI_BASE_URL_OPTIONS,
  DEFAULT_XGAPI_BASE_URL,
  normalizeXgapiBaseUrl
} from '../config/providers'
import ModelTokenPanel from './ModelTokenPanel.vue'

const props = defineProps({
  show: { type: Boolean, default: false }
})
const emit = defineEmits(['update:show', 'saved'])

const modelStore = useModelStore()
const dialog = useDialog()
const message = useMessage()

const showModal = ref(props.show)
const activeTokenId = ref(modelStore.currentTokenId)
const editingToken = ref(null)

const newChatModel = ref('')
const newImageModel = ref('')
const newVideoModel = ref('')

const baseUrlOptions = XGAPI_BASE_URL_OPTIONS

const tokenSelectOptions = computed(() =>
  modelStore.apiTokens.map((t) => ({
    label: t.name || t.id,
    value: t.id
  }))
)

const totalEnabledModels = computed(() => {
  if (!editingToken.value) return 0
  const m = editingToken.value.models
  return (m.chat?.length || 0) + (m.image?.length || 0) + (m.video?.length || 0)
})

const cloneToken = (token) => {
  if (!token) return null
  return JSON.parse(JSON.stringify(token))
}

const loadEditingToken = (id) => {
  const token = modelStore.apiTokens.find((t) => t.id === id)
  editingToken.value = cloneToken(token)
  if (editingToken.value) {
    editingToken.value.provider = 'chatfire'
    editingToken.value.baseUrl = normalizeXgapiBaseUrl(editingToken.value.baseUrl)
    editingToken.value.models ||= { chat: [], image: [], video: [] }
    editingToken.value.customModels ||= { chat: [], image: [], video: [] }
  }
}

watch(() => props.show, (val) => {
  showModal.value = val
  if (val) {
    activeTokenId.value = modelStore.currentTokenId || modelStore.apiTokens[0]?.id || ''
    loadEditingToken(activeTokenId.value)
  }
})

watch(showModal, (val) => emit('update:show', val))

watch(activeTokenId, (id) => {
  if (id) loadEditingToken(id)
})

const handleAddToken = () => {
  const token = modelStore.addToken({
    name: `令牌 ${modelStore.apiTokens.length + 1}`,
    provider: 'chatfire',
    baseUrl: DEFAULT_XGAPI_BASE_URL,
  })
  activeTokenId.value = token.id
  loadEditingToken(token.id)
}

const handleDeleteToken = () => {
  if (!editingToken.value) return
  dialog.warning({
    title: '删除令牌',
    content: `确定删除「${editingToken.value.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      modelStore.removeToken(editingToken.value.id)
      activeTokenId.value = modelStore.currentTokenId
      loadEditingToken(activeTokenId.value)
      message.success('令牌已删除')
    }
  })
}

const toggleBuiltinModel = (type, key) => {
  if (!editingToken.value) return
  const list = editingToken.value.models[type]
  const idx = list.indexOf(key)
  if (idx > -1) {
    list.splice(idx, 1)
    editingToken.value.customModels[type] = editingToken.value.customModels[type].filter((m) => m.key !== key)
  } else {
    list.push(key)
  }
}

const removeModel = (type, key) => {
  if (!editingToken.value) return
  editingToken.value.models[type] = editingToken.value.models[type].filter((k) => k !== key)
  editingToken.value.customModels[type] = editingToken.value.customModels[type].filter((m) => m.key !== key)
}

const addCustomModel = (type) => {
  const inputMap = { chat: newChatModel, image: newImageModel, video: newVideoModel }
  const val = inputMap[type].value.trim()
  if (!val || !editingToken.value) return
  if (editingToken.value.models[type].includes(val)) {
    message.warning('该模型已添加')
    return
  }
  editingToken.value.models[type].push(val)
  editingToken.value.customModels[type].push({ key: val, label: val })
  inputMap[type].value = ''
}

const handleSave = () => {
  if (!editingToken.value) {
    showModal.value = false
    return
  }

  modelStore.updateToken(editingToken.value.id, {
    name: editingToken.value.name,
    apiKey: editingToken.value.apiKey,
    provider: 'chatfire',
    baseUrl: normalizeXgapiBaseUrl(editingToken.value.baseUrl),
    models: editingToken.value.models,
    customModels: editingToken.value.customModels
  })

  modelStore.setCurrentTokenId(editingToken.value.id)
  modelStore.setProvider('chatfire')

  showModal.value = false
  emit('saved')
  message.success('API 配置已保存')
}
</script>

<style scoped>
.token-settings {
  max-height: 70vh;
  overflow-y: auto;
}

.token-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.token-form {
  margin-bottom: 8px;
}

.model-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: -8px 0 4px;
}
</style>
