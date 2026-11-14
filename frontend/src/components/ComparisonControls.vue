<script setup lang="ts">
import { ArrowLeftRight, Layers } from '@lucide/vue'
import type { FloodCase, ViewMode } from '../types'
withDefaults(defineProps<{ data: FloodCase | null; ready: boolean; overlayReady?: boolean }>(), { overlayReady: true })
defineEmits<{ interact: [] }>()
const mode = defineModel<ViewMode>('mode', { required: true })
const changeVisible = defineModel<boolean>('changeVisible', { required: true })
const opacity = defineModel<number>('opacity', { required: true })
const modes: { id: ViewMode; label: string }[] = [{ id: 'before', label: 'Before' }, { id: 'compare', label: 'Compare' }, { id: 'after', label: 'After' }]
</script>

<template>
  <footer class="control-deck" aria-label="Observation display controls">
    <div class="deck-title"><ArrowLeftRight :size="21" /><span>Compare observations<small>{{ data?.dataKind === 'synthetic-demo' ? 'Illustrative pair · no scientific measurements' : data ? 'Compatible observation pair' : 'No observations selected' }}</small></span></div>
    <div class="view-switch" role="group" aria-label="Observation view"><button v-for="view in modes" :key="view.id" :class="{ active: mode === view.id }" :aria-pressed="mode === view.id" :disabled="!data || !ready" @click="mode = view.id; $emit('interact')">{{ view.label }}</button></div>
    <div class="deck-divider" />
    <label class="change-toggle" :title="!overlayReady ? 'Change layer unavailable in the current view' : data?.change?.label"><input v-model="changeVisible" type="checkbox" role="switch" :disabled="!ready || !overlayReady || (!data?.change && !data?.areas)" /><span class="toggle-track" /><Layers :size="15" /><span>{{ data?.dataKind === 'synthetic-demo' ? 'Example overlay' : 'Change layer' }}</span></label>
    <label class="opacity-control"><span>Opacity</span><input v-model.number="opacity" type="range" min="10" max="100" :disabled="!ready" aria-label="Observation opacity" /><span>{{ opacity }}%</span></label>
    <div v-if="data" class="legend"><span class="eyebrow">{{ data.dataKind === 'synthetic-demo' ? 'ILLUSTRATIVE LEGEND' : data.units }}</span><div><span v-for="item in data.legend" :key="item.label"><i :style="{ background: item.color }" />{{ item.label }}</span></div></div>
  </footer>
</template>
