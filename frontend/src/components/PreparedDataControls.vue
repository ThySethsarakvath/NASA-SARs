<script setup lang="ts">
import type { PreparedCollection } from '../types'
defineProps<{ collection: PreparedCollection }>()
const before = defineModel<string>('before', { required: true })
const after = defineModel<string>('after', { required: true })
const representation = defineModel<string>('representation', { required: true })
const layer = defineModel<string>('layer', { required: true })
</script>

<template>
  <details class="prepared-controls">
    <summary>Dates & data layers <span>{{ collection.observations.length }} supplied dates</span></summary>
    <div class="prepared-fields">
      <label>View<select v-model="layer" aria-label="Data layer"><option value="">Dated comparison</option><option v-for="item in collection.layers" :key="item.id" :value="item.id">{{ item.label }}</option></select></label>
      <template v-if="!layer">
        <label>Display<select v-model="representation" aria-label="Display type"><option value="water">Water classifications</option><option value="radar">Radar display</option></select></label>
        <label>Before<select v-model="before" aria-label="Before export date"><option v-for="item in collection.observations" :key="item.date" :value="item.date" :disabled="item.date >= after">{{ item.date }}</option></select></label>
        <label>After<select v-model="after" aria-label="After export date"><option v-for="item in collection.observations" :key="item.date" :value="item.date" :disabled="item.date <= before">{{ item.date }}</option></select></label>
      </template>
    </div>
  </details>
</template>

<style scoped>
.prepared-controls { border: 1px solid #42606e; background: #0d202bf2; border-radius: 6px; font-size: 11px; color: #c3d8dc; }
summary { cursor: pointer; padding: 11px 14px; }
summary span { color: #91b3b8; margin-left: 12px; font-size: 9px; }
.prepared-fields { display: flex; flex-wrap: wrap; gap: 12px; padding: 0 14px 14px; }
label { display: flex; flex-direction: column; gap: 5px; flex: 1 1 125px; font-size: 10px; }
select { width: 100%; padding: 8px; background: #142c38; border: 1px solid #46636d; border-radius: 4px; color: #e2eeed; font: inherit; }
</style>
