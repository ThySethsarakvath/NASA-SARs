<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Waves, Trees, Sprout, Wind, ScanLine, Layers, BookOpen, ShieldCheck, Menu, X, UserRound, Pause, Play, Compass, House, ExternalLink, ChevronUp, SkipForward } from '@lucide/vue'
import { explorerUrl, agricultureUrl, photographs, teamMembers } from '../data/site'
import { CAMBODIA_FLIGHT_MS, GLOBE_EXPANSION_MS } from '../globe/flight'
import '../styles/landing.css'
import '../styles/hero-globe.css'

const props = defineProps<{ revealing?: boolean }>()
const menuOpen = ref(false)
const globeStage = ref<HTMLDivElement>(), launchStatus = ref<HTMLDivElement>()
const flying = ref(false)
let stageAnimation: Animation | undefined, previousOverflow: string | undefined
const emit = defineEmits<{ prepareExplorer: []; openExplorer: [] }>()
const HeroGlobe = defineAsyncComponent(() => import('../components/HeroGlobe.vue'))
const globe = ref<{ focusCambodia: () => Promise<void>; resetNorth: () => void; canFly: () => boolean } | null>(null)
const hero = ref<HTMLElement>()
const sceneIndex = ref(0), motionPaused = ref(false), entering = ref(false)
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)')
const reducedMotion = ref(motionPreference.matches)
let sceneTimer: number | undefined, launchTimer: number | undefined, disposed = false, heroVisible = true
let heroObserver: IntersectionObserver | undefined
const navigation = [ { label: 'Our mission', href: '#mission' }, { label: 'Our focus', href: '#themes' }, { label: 'The experience', href: '#experience' }, { label: 'Our team', href: '#team' } ]
const themes = [
  { id: '01', title: 'Flooding & water', icon: Waves, image: '/images/tonle-sap-wetlands.jpg', alt: 'Trees surrounded by water in the Tonlé Sap wetlands', text: 'Explore changing water through dated views, local context, and careful interpretation.', status: 'Current focus', active: true, url: explorerUrl, label: 'Explore flooding and water prototype' },
  { id: '02', title: 'Forests & deforestation', icon: Trees, image: '/images/prey-lang-forest.jpg', alt: 'Aerial view of the dense Prey Lang forest canopy in Cambodia', text: 'Upcoming: explore forest cover and deforestation. This explorer is not available yet.', status: 'Upcoming', active: false },
  { id: '03', title: 'Agriculture & croplands', icon: Sprout, image: '/images/cambodia-rice-fields.jpg', alt: 'Rice fields and open sky near Siem Reap, Cambodia', text: 'Follow cropland radar changes, rainfall and vegetation across six Tonlé Sap provinces.', status: 'Explore team data', active: true, url: agricultureUrl, label: 'Explore agriculture and croplands' },
  { id: '04', title: 'Atmosphere & air', icon: Wind, image: '/images/phnom-penh-skyline.jpg', alt: 'Sky and urban landscape above Phnom Penh, Cambodia', text: 'Upcoming: explore atmospheric conditions and air quality. This explorer is not available yet.', status: 'Upcoming', active: false },
]
type Theme = typeof themes[number]
const themeDialog = ref<HTMLDialogElement>()
const selectedTheme = ref<Theme | null>(null)
async function openTheme(theme: Theme) {
  if (theme.active) return
  selectedTheme.value = theme
  await nextTick()
  themeDialog.value?.showModal()
}
function closeTheme() { themeDialog.value?.close() }
const currentTheme = computed(() => themes[sceneIndex.value]!)
function restartScenes() {
  window.clearInterval(sceneTimer)
  if (reducedMotion.value || motionPaused.value || entering.value || document.hidden || !heroVisible) return
  sceneTimer = window.setInterval(() => { sceneIndex.value = (sceneIndex.value + 1) % themes.length }, 6500)
}
function onMotionChange() { reducedMotion.value = motionPreference.matches }
async function launchPrototype(event: MouseEvent) {
  // Preserve normal browser behavior for new-tab clicks and repeated activation.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || entering.value) return
  event.preventDefault()
  const origin = globeStage.value?.getBoundingClientRect()
  flying.value = !reducedMotion.value && !!globe.value?.canFly() && !!origin
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  entering.value = true
  emit('prepareExplorer')
  await nextTick()
  launchStatus.value?.focus({ preventScroll: true })
  if (flying.value && globeStage.value && origin) {
    stageAnimation = globeStage.value.animate([
      { left: `${origin.left}px`, top: `${origin.top}px`, width: `${origin.width}px`, height: `${origin.height}px` },
      { left: '0px', top: '0px', width: `${innerWidth}px`, height: `${innerHeight}px` },
    ], { duration: GLOBE_EXPANSION_MS, easing: 'cubic-bezier(.22,.61,.36,1)' })
  }
  const deadline = new Promise<void>((resolve) => { launchTimer = window.setTimeout(resolve, CAMBODIA_FLIGHT_MS + 800) })
  try { await Promise.race([globe.value?.focusCambodia() ?? Promise.resolve(), deadline]) }
  finally {
    window.clearTimeout(launchTimer)
    if (!disposed) emit('openExplorer')
  }
}
watch([reducedMotion, motionPaused, entering], restartScenes)
watch(reducedMotion, (reduce) => { if (reduce) stageAnimation?.cancel() })
onMounted(() => {
  motionPreference.addEventListener('change', onMotionChange)
  document.addEventListener('visibilitychange', restartScenes)
  if (hero.value) {
    heroObserver = new IntersectionObserver(([entry]) => { heroVisible = entry?.isIntersecting ?? false; restartScenes() })
    heroObserver.observe(hero.value)
  }
  restartScenes()
})
onUnmounted(() => {
  disposed = true
  stageAnimation?.cancel()
  if (previousOverflow !== undefined) document.body.style.overflow = previousOverflow
  window.clearInterval(sceneTimer); window.clearTimeout(launchTimer)
  motionPreference.removeEventListener('change', onMotionChange)
  document.removeEventListener('visibilitychange', restartScenes)
  heroObserver?.disconnect()
})
const steps = [
  { number: '01', icon: ScanLine, title: 'Start with a place.', text: 'Choose an available study window and see exactly which area is represented.' },
  { number: '02', icon: Layers, title: 'Look across time.', text: 'Compare two prepared views. Switch dates, move the divider, and inspect a supplied change layer.' },
  { number: '03', icon: BookOpen, title: 'Read the whole story.', text: 'Understand the source, the method, what a difference might mean, and what remains uncertain.' },
]
</script>

<template>
  <div id="home" class="landing" :inert="entering" @keydown.esc="menuOpen = false">
    <a class="skip-link" href="#landing-main">Skip to content</a>
    <header class="landing-header">
      <a class="landing-home-link" href="#home" aria-label="Home"><House :size="21" :stroke-width="1.5" /></a>
      <nav id="home-navigation" class="landing-nav" :class="{ 'is-open': menuOpen }" aria-label="Home navigation"><a v-for="item in navigation" :key="item.href" :href="item.href" @click="menuOpen = false">{{ item.label }}</a></nav>
      <div class="landing-header-actions"><button class="landing-menu-button" :aria-expanded="menuOpen" aria-controls="home-navigation" :aria-label="menuOpen ? 'Close navigation' : 'Open navigation'" @click="menuOpen = !menuOpen"><X v-if="menuOpen" :size="22" /><Menu v-else :size="22" /></button></div>
    </header>
    <main id="landing-main" tabindex="-1">
      <section ref="hero" class="landing-hero" :class="{ 'is-entering': entering, 'motion-paused': motionPaused || reducedMotion }" aria-labelledby="hero-title" :data-background-theme="currentTheme.id">
        <div class="hero-theme-photos" aria-hidden="true">
          <img v-for="(theme, i) in themes" :key="theme.id" class="landing-hero-image" :class="{ 'is-active': sceneIndex === i }" :src="theme.image" alt="" width="1280" height="853" :fetchpriority="i === 0 ? 'high' : 'low'" />
        </div>
        <div class="landing-hero-shade" />
        <div class="hero-right-gradient" aria-hidden="true" />
        <div class="landing-hero-content landing-container">
          <h1 id="hero-title">Our home.<br />Our planet.<br /><em>A closer look.</em></h1>
          <p>From the waters of Tonlé Sap to Cambodia’s croplands, forests and skies. Making Earth observations easier to explore, understand, and connect to life in Cambodia.</p>
          <div class="landing-hero-actions">
            <a :href="explorerUrl" class="landing-button" @click="launchPrototype">{{ entering ? 'Finding Cambodia…' : 'Explore the flood prototype' }}<ScanLine :size="19" /></a>
            <a :href="agricultureUrl" class="landing-text-link">Explore agriculture<Sprout :size="19" /></a>
          </div>
        </div>
        <div class="hero-globe-slot">
          <Teleport to="body" :disabled="!flying">
            <div ref="globeStage" class="hero-globe-stage" :class="{ 'is-flying': flying, 'is-revealing': props.revealing }"><HeroGlobe ref="globe" :paused="motionPaused" :reduced-motion="reducedMotion" /></div>
          </Teleport>
        </div>
        <div class="hero-scene-controls" role="group" aria-label="Globe controls">
          <button class="hero-motion-toggle" aria-label="Reset globe north up" title="Reset north up" :disabled="entering" @click="globe?.resetNorth()"><Compass :size="17" /><span>North up</span></button>
          <button class="hero-motion-toggle" :aria-pressed="motionPaused || reducedMotion" :disabled="reducedMotion || entering" :aria-label="reducedMotion ? 'Reduced motion enabled' : motionPaused ? 'Resume globe and backgrounds' : 'Pause globe and backgrounds'" @click="motionPaused = !motionPaused"><Play v-if="motionPaused && !reducedMotion" :size="13" /><Pause v-else :size="13" /><span>{{ reducedMotion ? 'Reduced motion' : motionPaused ? 'Resume motion' : 'Pause motion' }}</span></button>
        </div>

      </section>
      <section id="mission" class="landing-mission landing-container landing-section" aria-labelledby="mission-title">
        
        <div class="landing-mission-grid"><h2 id="mission-title">A changing landscape.<br /><span>A shared understanding.</span></h2><div><p class="landing-lead">Environmental change can feel far away. We want to make it feel closer to home.</p><p>Our objective is to turn complex Earth observations into a clear, interactive view of Cambodia. A place to compare, ask questions, and follow the evidence behind what we see.</p><p>Explore flooding and agriculture today, with forests and the atmosphere ahead. Each theme brings its own datasets, dates and limits; follow the evidence behind every view.</p></div></div>
        <div class="landing-values"><span><ScanLine :size="17" />Look at the evidence</span><span><BookOpen :size="17" />Make it understandable</span><span><ShieldCheck :size="17" />Be clear about uncertainty</span></div>
      </section>
      <section id="themes" class="landing-themes landing-section" aria-labelledby="themes-title"><div class="landing-container">
        <div class="landing-section-heading"><h2 id="themes-title">One home.<br /><em>More ways to understand it.</em></h2><p>Our vision spans four environmental themes.<br />Explore water and croplands. More chapters are ahead.</p></div>
        <div class="landing-theme-grid"><component :is="theme.active ? 'a' : 'button'" v-for="theme in themes" :key="theme.id" class="landing-theme-card" :class="{ 'theme-active': theme.active }" :href="theme.url" :type="theme.active ? undefined : 'button'" :aria-label="theme.active ? theme.label : `${theme.title} — upcoming`" :aria-haspopup="theme.active ? undefined : 'dialog'" @click="openTheme(theme)"><div class="landing-theme-image"><img :src="theme.image" :alt="theme.alt" width="640" height="420" loading="lazy" decoding="async" /><span class="landing-theme-number">{{ theme.id }}</span><span class="landing-theme-status"><span v-if="theme.active" />{{ theme.status }}</span></div><div class="landing-theme-body"><component :is="theme.icon" :size="23" :stroke-width="1.4" /><h3>{{ theme.title }}</h3><p>{{ theme.text }}</p></div></component></div>
      </div></section>
      <section id="experience" class="landing-experience landing-container landing-section" aria-labelledby="experience-title">
        <div class="landing-section-heading"><h2 id="experience-title">Don’t just see a change.<br /><em>Explore its story.</em></h2></div>
        <div class="landing-experience-grid"><div class="landing-explorer-preview"><img src="/images/tonle-sap-lake.jpg" alt="Tonlé Sap Lake near Kampong Phlouk, photographed in 2015" width="1280" height="550" loading="lazy" decoding="async" /><div class="landing-preview-shade" /><div class="landing-preview-top"><Waves :size="18" /><span>FLOODING / FIRST CHAPTER</span><span class="landing-preview-badge">UI PROTOTYPE</span></div><div class="landing-preview-copy"><span class="landing-kicker">THE WATER THAT CONNECTS US</span><h3>A closer look<br />at changing waters.</h3><a :href="explorerUrl" class="landing-round-link" aria-label="Open the flooding prototype"><ScanLine :size="25" /></a></div><div class="landing-preview-bottom"><span>TONLÉ SAP, CAMBODIA</span><span>Landscape photo · not analysis</span></div></div><div class="landing-step-list"><article v-for="step in steps" :key="step.number"><span class="landing-step-number">{{ step.number }}</span><div><component :is="step.icon" :size="21" :stroke-width="1.4" /><h3>{{ step.title }}</h3><p>{{ step.text }}</p></div></article></div></div>
        <div class="landing-data-note"><ShieldCheck :size="23" :stroke-width="1.4" /><div><h3>Clear sources. Honest context.</h3><p>Explore team-provided data exports alongside a clearly labeled development example. Imported layers still need traceable product identifiers, processing details, and scientific review. Landscape photos on this page introduce the place; they do not document a detected event. Every scientific case needs traceable inputs, reviewed explanations, and visible limitations.</p></div><a :href="explorerUrl" aria-label="Read the prototype evidence"><BookOpen :size="21" /></a></div>
      </section>
      <section id="team" class="landing-team landing-section" aria-labelledby="team-title"><div class="landing-container"><div class="landing-section-heading"><h2 id="team-title">Five curious minds.<br /><em>One place we call home.</em></h2><p>We’re a five-person team bringing design, data, and development together for Dancing with the SARs.</p></div>
        <div class="landing-team-grid"><article v-for="member in teamMembers" :key="member.id" class="landing-team-card"><div class="landing-team-portrait"><img v-if="member.photo" :src="member.photo" :alt="member.name ?? 'Team member portrait'" :style="{ height: `${(member.photoScale ?? 2) * 100}%`, transform: `translate(-${member.photoFocus?.[0] ?? 50}%, -${member.photoFocus?.[1] ?? 50}%)` }" loading="lazy" /><template v-else><span class="landing-team-index">{{ member.id }}</span><UserRound :size="52" :stroke-width=".8" /><span class="landing-portrait-label">PORTRAIT TO BE ADDED</span></template></div><div class="landing-member-info"><h3>{{ member.name ?? `Team member ${member.id}` }}</h3><p>{{ member.role ?? 'Name & role to be added' }}</p><span v-if="!member.name" class="landing-placeholder-label">PROFILE PLACEHOLDER</span></div></article></div>
      </div></section>
      <section class="landing-closing landing-container" aria-labelledby="closing-title"><div><span class="landing-kicker">EVERY OBSERVATION IS A BEGINNING</span><h2 id="closing-title">Start with water.<br /><em>Stay curious.</em></h2></div><div><p>Take the first step into our changing home.</p><a :href="explorerUrl" class="landing-button">Open the flood explorer<ScanLine :size="20" /></a><small>Prototype · team exports awaiting review</small></div></section>
    </main>
    <Teleport to="body">
      <div v-if="entering" class="hero-flight-veil" :class="{ 'is-revealing': props.revealing, 'is-instant': reducedMotion }" aria-hidden="true" />
      <div v-if="entering" ref="launchStatus" class="hero-launch-status" :class="{ 'is-revealing': props.revealing }" role="status" tabindex="-1"><span>Locating Cambodia. Opening the flood explorer…</span><a :href="explorerUrl">Skip animation<SkipForward :size="14" /></a></div>
    </Teleport>
    <dialog ref="themeDialog" class="landing-theme-dialog" aria-labelledby="theme-dialog-title" @click="($event.target === themeDialog) && closeTheme()">
      <template v-if="selectedTheme">
        <button class="theme-dialog-close" aria-label="Close theme details" @click="closeTheme"><X :size="20" /></button>
        <component :is="selectedTheme.icon" :size="32" :stroke-width="1.4" />
        <p class="theme-dialog-status">UPCOMING</p>
        <h2 id="theme-dialog-title" tabindex="-1" autofocus>{{ selectedTheme.title }}</h2>
        <p>{{ selectedTheme.text }}</p>
        <p>This explorer is not available yet. We currently explore flooding and agriculture; this upcoming theme needs dedicated datasets and reviewed methods before it opens.</p>
        <button class="landing-button" @click="closeTheme">Got it</button>
      </template>
    </dialog>
    <footer class="landing-footer"><div class="landing-container"><div class="landing-footer-top"><a class="landing-brand" href="/" aria-label="Back to the top"><span class="landing-brand-mark"><Waves :size="25" /></span><span>CAMBODIA<small>OUR CHANGING HOME</small></span></a><p>A local perspective.<br />A planet worth understanding.</p><a href="https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/" target="_blank" rel="noopener noreferrer">Dancing with the SARs<ExternalLink :size="15" /><small>NASA Space Apps Challenge 2026</small></a></div>
      <details id="photo-credits" class="landing-credits"><summary>Photography & credits <span>Landscape photos + globe geography</span></summary><p>Contextual landscape photographs, not NISAR observations or evidence of current conditions. Displayed with responsive cropping and dark overlays. Photographic works retain the linked licenses; no photographer endorsement is implied.</p><ul><li v-for="photo in photographs" :key="photo.id"><a :href="photo.source" target="_blank" rel="noopener noreferrer">{{ photo.title }} — {{ photo.author }}<ExternalLink :size="12" /></a><span>{{ photo.location }} · {{ photo.date }}</span><a :href="photo.licenseUrl" target="_blank" rel="noopener noreferrer">{{ photo.license }}</a></li><li><a href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/" target="_blank" rel="noopener noreferrer">Blue Marble — NASA Earth Observatory<ExternalLink :size="12" /></a><span>Produced by Reto Stöckli · July 2004 composite · dark illustrative styling</span><a href="https://www.nasa.gov/nasa-brand-center/images-and-media/" target="_blank" rel="noopener noreferrer">NASA media usage guidelines</a></li><li><a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Country outlines — Natural Earth<ExternalLink :size="12" /></a><span>1:110 million generalized geography · context only</span><a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">Public-domain geographic data</a></li></ul></details>
      <div class="landing-footer-bottom"><span>© 2026 Cambodia project team</span><p>Independent hackathon project. No NASA endorsement implied.</p><a href="#home">Back to top<ChevronUp :size="15" /></a></div>
    </div></footer>
  </div>
</template>
