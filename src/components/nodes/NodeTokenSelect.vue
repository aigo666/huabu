<template>
  <div class="flex items-center justify-between gap-2 nodrag nopan" @mousedown.stop @click.stop>
    <span class="text-xs text-[var(--text-secondary)] shrink-0">令牌</span>
    <n-select
      v-model:value="innerValue"
      :options="options"
      size="tiny"
      class="node-token-select"
      :disabled="configuredTokens.length === 0"
      placeholder="自动（轮询）"
      to="body"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { NSelect } from 'naive-ui'
import { useModelStore } from '@/stores/pinia'

const props = defineProps({
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const modelStore = useModelStore()

const configuredTokens = computed(() =>
  modelStore.apiTokens.filter((t) => t.apiKey)
)

const options = computed(() => [
  { label: '自动（轮询）', value: '' },
  ...configuredTokens.value.map((t) => ({
    label: t.name || '未命名令牌',
    value: t.id
  }))
])

const innerValue = computed({
  get: () => props.modelValue || '',
  set: (v) => emit('update:modelValue', v || '')
})
</script>

<style scoped>
.node-token-select {
  width: 140px;
  min-width: 140px;
}
</style>
