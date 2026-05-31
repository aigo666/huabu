<template>
  <!-- Custom edge with image role selector | 带图片角色选择器的自定义边 -->
  <BaseEdge :path="path" :style="edgeStyle" />
  
  <!-- Edge label with role dropdown | 带角色下拉的边标签 -->
  <EdgeLabelRenderer>
    <div 
      :style="{ 
        position: 'absolute', 
        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        pointerEvents: 'all'
      }"
      class="nodrag nopan"
    >
      <n-dropdown 
        :options="imageRoleOptions" 
        @select="handleRoleSelect"
        size="small"
      >
        <button 
          class="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow transition-shadow"
        >
          {{ currentRoleLabel }}
          <n-icon :size="10"><ChevronDownOutline /></n-icon>
        </button>
      </n-dropdown>
    </div>
  </EdgeLabelRenderer>
</template>

<script setup>
import { computed } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useVueFlow } from '@vue-flow/core'
import { NDropdown, NIcon } from 'naive-ui'
import { ChevronDownOutline } from '@vicons/ionicons5'
import { edges, nodes } from '../../stores/canvas'
import { isSoraVideoModel } from '../../utils/soraVideo'

const { updateEdgeData } = useVueFlow()

const props = defineProps({
  id: String,
  source: String,
  target: String,
  sourceX: Number,
  sourceY: Number,
  targetX: Number,
  targetY: Number,
  sourcePosition: String,
  targetPosition: String,
  data: Object,
  markerEnd: String,
  style: Object
})

const ALL_IMAGE_ROLE_OPTIONS = [
  { label: '首帧', key: 'first_frame_image' },
  { label: '尾帧', key: 'last_frame_image' },
  { label: '参考图', key: 'input_reference' }
]

const SORA_IMAGE_ROLE_OPTIONS = [{ label: '参考图', key: 'input_reference' }]

const targetNode = computed(() => nodes.value.find((n) => n.id === props.target))

const isSoraVideoTarget = computed(
  () => targetNode.value?.type === 'videoConfig' && isSoraVideoModel(targetNode.value?.data?.model)
)

const imageRoleOptions = computed(() =>
  isSoraVideoTarget.value ? SORA_IMAGE_ROLE_OPTIONS : ALL_IMAGE_ROLE_OPTIONS
)

const currentRole = computed(() => {
  const role = props.data?.imageRole || 'first_frame_image'
  if (isSoraVideoTarget.value && role !== 'input_reference') return 'input_reference'
  return role
})

const currentRoleLabel = computed(() => {
  const option = imageRoleOptions.value.find(o => o.key === currentRole.value)
  return option?.label || '参考图'
})

const path = computed(() => {
  const [edgePath] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition
  })
  return edgePath
})

const labelX = computed(() => (props.sourceX + props.targetX) / 2)
const labelY = computed(() => (props.sourceY + props.targetY) / 2)

const edgeStyle = computed(() => ({
  stroke: '#6366f1',
  strokeWidth: 2,
  ...props.style
}))

const handleRoleSelect = (role) => {
  if (isSoraVideoTarget.value) {
    updateEdgeData(props.id, { imageRole: 'input_reference' })
    return
  }

  if (role === 'first_frame_image' || role === 'last_frame_image') {
    const sameTargetEdges = edges.value.filter(edge => 
      edge.target === props.target && 
      edge.id !== props.id && 
      edge.data?.imageRole === role
    )
    
    sameTargetEdges.forEach(edge => {
      const oppositeRole = role === 'first_frame_image' ? 'last_frame_image' : 'first_frame_image'
      updateEdgeData(edge.id, { imageRole: oppositeRole })
    })
  }
  
  updateEdgeData(props.id, { imageRole: role })
}
</script>
