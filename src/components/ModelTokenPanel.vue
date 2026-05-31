<template>
  <div class="model-panel">
    <div class="model-panel-header">
      <span class="model-panel-title">{{ title }}</span>
      <n-tag size="tiny" :type="tagType">{{ enabledKeys.length }} 个已启用</n-tag>
    </div>

    <div class="builtin-section">
      <div class="sub-label">内置模型（点击添加/移除）</div>
      <div class="model-tags">
        <n-tag
          v-for="model in builtinModels"
          :key="model.key"
          size="small"
          :type="enabledKeys.includes(model.key) ? tagType : 'default'"
          :bordered="!enabledKeys.includes(model.key)"
          class="clickable-tag"
          @click="$emit('toggle', model.key)"
        >
          {{ enabledKeys.includes(model.key) ? '✓ ' : '+ ' }}{{ model.label }}
        </n-tag>
      </div>
    </div>

    <div v-if="enabledModels.length" class="enabled-section">
      <div class="sub-label">已启用</div>
      <div class="model-tags">
        <n-tag
          v-for="model in enabledModels"
          :key="model.key"
          size="small"
          :type="model.isCustom ? tagType : 'default'"
          closable
          @close="$emit('remove', model.key)"
        >
          {{ model.label }}
          <span v-if="model.isCustom" class="custom-badge">自定义</span>
        </n-tag>
      </div>
    </div>

    <div class="custom-row">
      <n-input
        :value="customInput"
        :placeholder="`自定义${title}，如 my-model`"
        size="small"
        @update:value="$emit('update:customInput', $event)"
        @keyup.enter="$emit('add-custom')"
      />
      <n-button size="small" type="primary" :disabled="!customInput?.trim()" @click="$emit('add-custom')">
        添加自定义
      </n-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { NTag, NInput, NButton } from 'naive-ui'

const props = defineProps({
  title: String,
  tagType: { type: String, default: 'default' },
  builtinModels: { type: Array, default: () => [] },
  enabledKeys: { type: Array, default: () => [] },
  customInput: { type: String, default: '' }
})

defineEmits(['toggle', 'remove', 'add-custom', 'update:customInput'])

const enabledModels = computed(() =>
  props.enabledKeys.map((key) => {
    const builtin = props.builtinModels.find((m) => m.key === key)
    return builtin
      ? { key, label: builtin.label, isCustom: false }
      : { key, label: key, isCustom: true }
  })
)
</script>

<style scoped>
.model-panel {
  padding: 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
}

.model-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.model-panel-title {
  font-size: 14px;
  font-weight: 500;
}

.sub-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.builtin-section,
.enabled-section {
  margin-bottom: 10px;
}

.model-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.clickable-tag {
  cursor: pointer;
  user-select: none;
}

.custom-row {
  display: flex;
  gap: 8px;
}

.custom-row .n-input {
  flex: 1;
}

.custom-badge {
  margin-left: 4px;
  opacity: 0.7;
  font-size: 10px;
}
</style>
