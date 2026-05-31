<template>
  <div
    class="node-model-select nodrag nopan"
    :class="{ 'node-model-select--compact': !showLabel }"
    @mousedown.stop
    @click.stop
  >
    <span v-if="showLabel" class="node-model-label">{{ label }}</span>
    <n-select
      :value="modelValue || null"
      :options="selectOptions"
      size="tiny"
      label-field="label"
      value-field="key"
      class="node-model-select-input"
      :style="compactWidthStyle"
      :disabled="!models.length"
      :placeholder="models.length ? '选择模型' : '无可用模型'"
      :consistent-menu-width="false"
      :menu-props="menuProps"
      to="body"
      @update:value="handleSelect"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { NSelect } from 'naive-ui'
import { useModelStore } from '@/stores/pinia'

const props = defineProps({
  modelValue: { type: String, default: '' },
  type: { type: String, required: true },
  tokenId: { type: String, default: '' },
  label: { type: String, default: '模型' },
  showLabel: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue'])

const modelStore = useModelStore()

const models = computed(() =>
  modelStore.getNodeTokenModels(props.type, props.tokenId || '')
)

const selectOptions = computed(() =>
  models.value.map((m) => ({
    label: m.isCustom ? `${m.label}（自定义）` : m.label,
    key: m.key
  }))
)

const measureTextWidth = (text) => {
  if (!text) return 0
  if (typeof document === 'undefined') return text.length * 8
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  return ctx.measureText(text).width
}

/** 紧凑模式：按最长模型名自适应宽度 */
const compactSelectWidth = computed(() => {
  if (props.showLabel) return null
  const labels = selectOptions.value.map((o) => o.label)
  if (!labels.length) return 128
  const longestWidth = Math.max(...labels.map((label) => measureTextWidth(label)))
  const chrome = 44
  const max = Math.min(480, Math.floor(window.innerWidth * 0.45))
  return Math.min(max, Math.max(128, Math.ceil(longestWidth + chrome)))
})

const compactWidthStyle = computed(() =>
  compactSelectWidth.value ? { width: `${compactSelectWidth.value}px` } : undefined
)

const menuProps = computed(() => ({
  class: 'node-model-select-menu',
  style: compactSelectWidth.value
    ? { minWidth: `${compactSelectWidth.value}px` }
    : undefined
}))

const handleSelect = (key) => {
  if (key) emit('update:modelValue', key)
}
</script>

<style scoped>
.node-model-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.node-model-label {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.node-model-select-input {
  flex: 1;
  min-width: 0;
  max-width: 220px;
}

.node-model-select--compact {
  flex: none;
}

.node-model-select--compact .node-model-select-input {
  flex: none;
  max-width: none;
}
</style>

<style>
.node-model-select-menu {
  min-width: 280px !important;
  max-width: min(480px, 90vw);
}

.node-model-select-menu .n-base-select-option__content {
  white-space: nowrap !important;
  line-height: 1.4;
}
</style>
