<script setup lang="ts">
import Select from 'primevue/select'

defineProps<{
  modelValue: string | number | null
  options: Array<{ label: string; value: string | number | null; disabled?: boolean }>
  placeholder?: string
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string | number | null]
}>()
</script>

<template>
  <Select
    :model-value="modelValue"
    :options="options"
    option-label="label"
    option-value="value"
    option-disabled="disabled"
    filter
    reset-filter-on-hide
    :placeholder="placeholder"
    :disabled="disabled"
    class="searchable-select w-full"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<style scoped>
.searchable-select {
  width: 100%;
}
.searchable-select :deep(.p-select) {
  width: 100%;
  min-height: 38px;
}
</style>
