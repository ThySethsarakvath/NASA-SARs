<script setup lang="ts">
import { ref, watch } from 'vue'
import { ExternalLink, Info, X } from '@lucide/vue'
import type { FloodCase } from '../types'
const props = defineProps<{ open: boolean; data: FloodCase | null }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
watch(() => props.open, (open) => { if (open && !dialog.value?.open) dialog.value?.showModal(); else if (!open && dialog.value?.open) dialog.value?.close() })
</script>

<template>
  <dialog ref="dialog" class="sources-dialog" aria-labelledby="sources-title" @close="emit('close')" @click="($event.target === dialog) && emit('close')">
    <div class="dialog-content"><div class="dialog-top"><span class="eyebrow">TRANSPARENCY BY DESIGN</span><button class="icon-button" aria-label="Close sources" @click="emit('close')"><X :size="20" /></button></div><h2 id="sources-title">Behind the observations.</h2>
      <p>Every view should be traceable to its source, method, and limitations.</p>
      <div v-if="data?.dataKind === 'synthetic-demo'" class="source-warning"><Info :size="19" /><div><strong>This is a synthetic development case.</strong><p>The schematic images, illustrative dates, and guided viewpoints test the interface. They are not NISAR acquisitions, flood detections, or environmental findings.</p></div></div>
      <div v-if="data?.dataKind === 'team-export'" class="source-warning"><Info :size="19" /><div><strong>Team-provided exports · review pending.</strong><p>The team reports ASF as the download source and NISAR L-band in the archive README. Original product IDs, processing thresholds, valid-data masks and validation evidence are not included. PNG display values are not calibrated backscatter.</p></div></div>
      <div v-if="data?.provenance" class="sources-list"><a :href="data.provenance" target="_blank" rel="noopener noreferrer"><span>Import provenance & file checksums<small>Local JSON record · original archive retained</small></span><ExternalLink :size="17" /></a></div>
      <div v-if="data" class="sources-list"><a v-for="source in data.sources" :key="source.url" :href="source.url" target="_blank" rel="noopener noreferrer"><span>{{ source.title }}<small>Reference / opens in a new tab</small></span><ExternalLink :size="17" /></a></div>
      <div class="handoff-note"><span class="eyebrow">FOR THE DATA TEAM</span><h3>Prepared assets. Explicit context.</h3><p>Supply aligned images, geographic placement, acquisition identifiers, a legend, and reviewed explanations through the case manifest. No credentials belong in public assets.</p></div>
      <p class="quiet-note">An independent hackathon project for NASA Space Apps Challenge 2026. No NASA endorsement is implied.</p>
    </div>
  </dialog>
</template>
