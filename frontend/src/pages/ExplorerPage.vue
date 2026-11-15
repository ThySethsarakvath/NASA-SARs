<script setup lang="ts">
import { defineAsyncComponent, ref, watch } from 'vue'
import { ArrowRight, ArrowUpRight, ChevronLeft, Link, MapPin, Play, Search, Waves, X, Info, PanelRightOpen, RotateCcw } from '@lucide/vue'
import EvidencePanel from '../components/EvidencePanel.vue'
import SourceDialog from '../components/SourceDialog.vue'
import ComparisonControls from '../components/ComparisonControls.vue'
import { useExplorer } from '../composables/useExplorer'
import { usePreparedCollection } from '../composables/usePreparedCollection'
import PreparedDataControls from '../components/PreparedDataControls.vue'
import { agricultureUrl } from '../data/site'

const MapWorkspace = defineAsyncComponent(() => import('../components/MapWorkspace.vue'))
const props = withDefaults(defineProps<{ arriving?: boolean; activated?: boolean }>(), { arriving: false, activated: true })
const emit = defineEmits<{ ready: [value: boolean] }>()

const { entries, selectedId, activeCase, loading, error, mode, changeVisible, opacity, storyIndex, storyStep, sourcesOpen, panelOpen, introVisible, focused, focusVersion, query, filteredEntries, focusCase, startStory, moveStory, retry } = useExplorer()
const { data: displayCase, collection, layer, beforeDate, afterDate, representation, layerId, baselineOnly, baselineAvailable, selectionError, lowHighPair, compareLowHigh } = usePreparedCollection(activeCase)
if (props.arriving) introVisible.value = false
watch(activeCase, (data) => { if (data?.dataKind === 'team-export') focusCase() })
const comparisonReady = ref(false), overlayReady = ref(false), shareStatus = ref('')
async function share() {
  try { await navigator.clipboard.writeText(location.href); shareStatus.value = 'Link copied' }
  catch { shareStatus.value = 'Share the URL in your address bar' }
}
function selectCase(id: string) { selectedId.value = id; focusCase() }
</script>

<template>
  <a class="skip-link" href="#evidence">Skip map and read the evidence</a>
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="Cambodia Flood Explorer home"><span class="brand-symbol"><Waves :size="23" /></span><span>CAMBODIA<span class="brand-sub">FLOOD EXPLORER</span></span><span class="beta">FIELD NOTES / 01</span></a>
      <nav aria-label="Main navigation">
        <button class="nav-link active" @click="storyIndex = null; introVisible = false">Explore</button>
        <button class="nav-link" :disabled="!activeCase?.story.length" @click="startStory">Guided story</button>
        <button class="nav-link" @click="sourcesOpen = true">Sources<ArrowUpRight :size="13" /></button>
        <a class="nav-link" :href="agricultureUrl">Agriculture</a>
      </nav>
      <button class="share-button" @click="share"><Link :size="15" /><span>{{ shareStatus || 'Share view' }}</span></button>
    </header>

    <div class="data-banner" :class="{ real: activeCase?.dataKind === 'real-observation' }" role="status">
      <span class="status-dot" />
      <template v-if="activeCase?.dataKind === 'synthetic-demo'"><strong>Development example</strong><span class="banner-detail">Synthetic imagery · no real NISAR observations or flood findings</span></template>
      <template v-else-if="activeCase?.dataKind === 'team-export'"><strong>Team data · unreviewed</strong><span class="banner-detail">Derived exports · source provenance and validation pending</span></template>
      <template v-else-if="activeCase"><strong>{{ activeCase.dataKind === 'surrogate' ? 'Surrogate example' : 'Real observations' }}</strong><span class="banner-detail">{{ activeCase.reviewStatus.replaceAll('-', ' ') }} · read the evidence and limitations</span></template>
      <template v-else><strong>Preparing your workspace</strong><span class="banner-detail">Available observations and coverage will be shown explicitly</span></template>
      <button aria-label="About these data" @click="sourcesOpen = true"><Info :size="15" /></button>
    </div>

    <div class="workspace">
      <aside class="case-sidebar" aria-label="Available cases">
        <div class="sidebar-heading"><span class="eyebrow">01 / EXPLORE</span><span class="live-label">PHASE ONE</span></div>
        <h1>Following<br />the <em>water.</em></h1>
        <p class="sidebar-intro">A closer look at Cambodia’s changing waters, one observation at a time.</p>
        <label class="search-field"><Search :size="16" /><input v-model="query" type="search" placeholder="Find a study window" aria-label="Find a study window" /></label>
        <div class="section-label">STUDY WINDOWS<span>{{ String(entries.length).padStart(2, '0') }}</span></div>
        <div class="case-list">
          <button v-for="(entry, i) in filteredEntries" :key="entry.id" class="case-card" :class="{ selected: entry.id === selectedId }" :aria-pressed="entry.id === selectedId" @click="selectCase(entry.id)">
            <div class="case-thumbnail"><span class="thumbnail-river" /><span class="case-number">{{ String(i + 1).padStart(2, '0') }}</span><span class="case-kind">{{ entry.dataKind === 'synthetic-demo' ? 'SYNTHETIC' : entry.dataKind === 'surrogate' ? 'SURROGATE' : entry.dataKind === 'team-export' ? 'TEAM EXPORT' : 'OBSERVATIONS' }}</span></div>
            <div class="case-card-content"><span class="case-title">{{ entry.title }}<ArrowUpRight :size="16" /></span><span class="case-location"><MapPin :size="12" />{{ entry.location }}</span><span class="case-card-foot">{{ entry.dataKind === 'synthetic-demo' ? 'Interface demonstration' : entry.dataKind === 'team-export' ? '11 dated team exports' : 'Available observation pair' }}<span class="selection-dot" /></span></div>
          </button>
          <p v-if="!loading && !filteredEntries.length" class="empty-state">{{ entries.length ? 'No matching study windows. Try another name.' : 'No study windows are available yet.' }}</p>
        </div>
        <div class="coverage-note"><span class="dashed-key" /><div><strong>Coverage, made clear.</strong><p>{{ activeCase?.coverageType === 'display-extent' ? 'Dashed bounds show the supplied export rectangle. Valid analysis support was not provided.' : 'The map shows available study windows. Areas outside them have no analyzed observations in this explorer.' }}</p></div></div>
        <div class="sidebar-footer"><Waves :size="16" /><span>NASA Space Apps Challenge 2026<br /><strong>Dancing with the SARs</strong></span></div>
      </aside>

      <main tabindex="-1" class="map-main" aria-label="Flood observation explorer">
        <div class="mobile-case-bar"><select v-model="selectedId" aria-label="Select study window"><option v-for="entry in entries" :key="entry.id" :value="entry.id">{{ entry.title }}</option></select><button class="icon-button" aria-label="Open evidence panel" @click="panelOpen = !panelOpen"><PanelRightOpen :size="18" /></button></div>
        <PreparedDataControls v-if="collection" class="prepared-data-bar" :collection="collection" :baseline-available="baselineAvailable" :can-compare-low-high="!!lowHighPair" v-model:baseline-only="baselineOnly" @compare-low-high="compareLowHigh(); mode = 'compare'; changeVisible = false; focusCase()" v-model:before="beforeDate" v-model:after="afterDate" v-model:representation="representation" v-model:layer="layerId" @update:before="changeVisible = false" @update:after="changeVisible = false" @update:layer="changeVisible = false" @update:baseline-only="changeVisible = false" />
        <MapWorkspace :data="displayCase" :layer="layer" :arriving="props.arriving" :activated="props.activated" :mode="mode" :change-visible="changeVisible" :opacity="opacity" :focused="focused" :focus-version="focusVersion" :story-step="storyStep" @ready="comparisonReady = $event" @overlay-ready="overlayReady = $event; if (!$event) changeVisible = false" @single-view-needed="mode = 'after'" @view-ready="emit('ready', $event)" />
        <div v-if="loading" class="map-loading" role="status"><span class="loading-ring" />Loading study window…</div>
        <div v-if="selectionError" class="map-notice image-notice" role="alert">{{ selectionError }}</div>
        <div v-if="error" class="map-error" role="alert"><Info :size="20" /><h2>We couldn’t open this case.</h2><p>{{ error }}</p><button class="primary-button" @click="retry"><RotateCcw :size="15" />Try again</button></div>

        <Transition name="intro">
          <section v-if="introVisible && activeCase && !error" class="intro-card" aria-label="Welcome to the explorer">
            <div class="intro-top"><span class="eyebrow">EARTH, IN A DIFFERENT LIGHT</span><button class="icon-button" aria-label="Dismiss introduction" @click="introVisible = false"><X :size="16" /></button></div>
            <h2>Every change<br />has a <em>story.</em></h2>
            <p>Look closer at the water shaping Cambodia. Compare dated views, explore the evidence, and understand what remains uncertain.</p>
            <div class="intro-actions"><button class="primary-button" @click="focusCase">Explore flooding<ArrowRight :size="16" /></button><button class="text-button" :disabled="!activeCase.story.length" @click="startStory"><Play :size="13" />Take the guided tour</button></div>
            <div class="intro-foot"><span class="tiny-square" />{{ activeCase.dataKind === 'synthetic-demo' ? 'SYNTHETIC CASE · BUILT FOR DATA HANDOFF' : 'OBSERVATIONS · CONTEXT · EVIDENCE' }}</div>
          </section>
        </Transition>

        <section v-if="storyStep" class="story-card" aria-label="Guided story">
          <div class="story-card-top"><span class="eyebrow">GUIDED STORY / {{ String((storyIndex ?? 0) + 1).padStart(2, '0') }}</span><button class="icon-button" aria-label="Close guided story" @click="storyIndex = null"><X :size="16" /></button></div>
          <h2>{{ storyStep.title }}</h2><p>{{ storyStep.body }}</p>
          <div class="story-controls"><div class="story-progress"><span v-for="(_, i) in activeCase?.story" :key="i" :class="{ current: i === storyIndex }" /></div><button class="icon-button" aria-label="Previous story step" :disabled="storyIndex === 0" @click="moveStory(-1)"><ChevronLeft :size="18" /></button><button class="story-next" @click="moveStory(1)">{{ storyIndex === (activeCase?.story.length ?? 0) - 1 ? 'Finish story' : 'Next' }}<ArrowRight :size="15" /></button></div>
        </section>

        <div v-if="activeCase && !introVisible && !storyStep" class="case-map-caption"><span class="eyebrow">SELECTED STUDY WINDOW</span><strong>{{ activeCase.title }}</strong><span>{{ activeCase.dataKind === 'synthetic-demo' ? 'Illustrative location · schematic layers' : activeCase.dataKind === 'team-export' ? 'Team-derived layers · provenance pending' : activeCase.location }}</span></div>
        <div class="map-bottom-strip"><span><span class="tiny-square" />{{ activeCase?.dataKind === 'synthetic-demo' ? 'SYNTHETIC DEVELOPMENT CASE' : activeCase?.dataKind === 'team-export' ? 'TEAM EXPORTS · UNREVIEWED' : activeCase?.dataKind === 'real-observation' ? 'REAL OBSERVATIONS' : activeCase ? 'SURROGATE EXAMPLE' : 'AWAITING CASE DATA' }}</span><button @click="panelOpen = true"><Info :size="13" />Read the evidence</button></div>
      </main>

      <EvidencePanel :data="displayCase" :layer="layer" :mode="mode" :baseline-only="baselineOnly" :open="panelOpen" :loading="loading" @close="panelOpen = false" @sources="sourcesOpen = true" />
    </div>
    <ComparisonControls v-model:mode="mode" v-model:change-visible="changeVisible" v-model:opacity="opacity" :data="displayCase" :layer="layer" :ready="comparisonReady" :overlay-ready="overlayReady" @interact="introVisible = false" />
  </div>
  <SourceDialog :open="sourcesOpen" :data="displayCase" @close="sourcesOpen = false" />
</template>
