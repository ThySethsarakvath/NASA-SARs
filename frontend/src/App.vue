<script setup lang="ts">
import { defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue'
import LandingPage from './pages/LandingPage.vue'
import { explorerUrl } from './data/site'
import './styles/handoff.css'
import { MAP_REVEAL_MS } from './globe/flight'

// Query navigation supports static hosting; existing shared case URLs still work.
const routeIsExplorer = () => { const params = new URLSearchParams(location.search); return params.get('page') === 'explore' || params.has('case') }
const isExplorer = ref(routeIsExplorer())
const preparing = ref(false), revealing = ref(false), arrived = ref(false), homeKey = ref(0)
let mapReady = false, flightComplete = false
let deadline: number | undefined, revealTimer: number | undefined
const ExplorerPage = defineAsyncComponent(() => import('./pages/ExplorerPage.vue'))
document.title = isExplorer.value ? 'Cambodia Flood Explorer' : 'Cambodia — Our changing home'

function tryReveal() {
  if (!preparing.value || revealing.value || !mapReady || !flightComplete) return
  window.clearTimeout(deadline)
  isExplorer.value = true; revealing.value = true
  document.title = 'Cambodia Flood Explorer'
  const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : MAP_REVEAL_MS
  revealTimer = window.setTimeout(() => {
    preparing.value = false; revealing.value = false
    window.scrollTo({ top: 0, behavior: 'instant' })
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.explorer-layer main')?.focus({ preventScroll: true }))
  }, duration)
}
function prepareExplorer() {
  if (preparing.value || isExplorer.value) return
  history.pushState(null, '', explorerUrl)
  mapReady = false; flightComplete = false
  arrived.value = true; preparing.value = true
  // A slow basemap must not trap the visitor behind an animation.
  deadline = window.setTimeout(() => { mapReady = true; tryReveal() }, 6000)
}
function openExplorer() { flightComplete = true; tryReveal() }
function explorerReady(ready: boolean) { if (ready) { mapReady = true; tryReveal() } }
function followHistory() {
  const target = routeIsExplorer()
  if (!preparing.value && target === isExplorer.value) return
  window.clearTimeout(deadline); window.clearTimeout(revealTimer)
  preparing.value = false; revealing.value = false; arrived.value = false
  isExplorer.value = target; homeKey.value++
  document.title = target ? 'Cambodia Flood Explorer' : 'Cambodia — Our changing home'
}
onMounted(() => window.addEventListener('popstate', followHistory))
onUnmounted(() => { window.clearTimeout(deadline); window.clearTimeout(revealTimer); window.removeEventListener('popstate', followHistory) })
</script>

<template>
  <div class="experience-root" :class="{ 'is-preparing': preparing, 'is-revealing': revealing }" :data-handoff="preparing ? revealing ? 'revealing' : 'preparing' : isExplorer ? 'explorer' : 'home'">
    <div v-if="!isExplorer || preparing" class="landing-layer"><LandingPage :key="homeKey" :revealing="revealing" @prepare-explorer="prepareExplorer" @open-explorer="openExplorer" /></div>
    <div v-if="isExplorer || preparing" class="explorer-layer" :inert="preparing && !revealing" :aria-hidden="preparing && !revealing ? 'true' : undefined"><ExplorerPage :arriving="arrived" :activated="revealing || (isExplorer && !preparing)" @ready="explorerReady" /></div>
  </div>
</template>
