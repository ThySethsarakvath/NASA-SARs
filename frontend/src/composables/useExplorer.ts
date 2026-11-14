import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { parseCase, parseIndex, readJson } from '../data/contract'
import type { CaseEntry, FloodCase, ViewMode } from '../types'

export function useExplorer() {
  const entries = ref<CaseEntry[]>([])
  const selectedId = ref(new URLSearchParams(location.search).get('case') ?? '')
  const modeParam = new URLSearchParams(location.search).get('view')
  const mode = ref<ViewMode>(modeParam === 'before' || modeParam === 'after' ? modeParam : 'compare')
  const activeCase = shallowRef<FloodCase | null>(null)
  const loading = ref(true), error = ref(''), changeVisible = ref(false), opacity = ref(75)
  const storyIndex = ref<number | null>(null), sourcesOpen = ref(false), panelOpen = ref(false), introVisible = ref(true)
  const focused = ref(false), focusVersion = ref(0)
  const query = ref('')
  const filteredEntries = computed(() => entries.value.filter((e) => `${e.title} ${e.location}`.toLowerCase().includes(query.value.toLowerCase())))
  const storyStep = computed(() => storyIndex.value === null ? null : activeCase.value?.story[storyIndex.value] ?? null)
  let controller: AbortController | undefined
  let indexController: AbortController | undefined
  let initialized = false, disposed = false

  async function loadCase() {
    controller?.abort()
    const current = new AbortController()
    controller = current
    loading.value = true; error.value = ''; activeCase.value = null; changeVisible.value = false; storyIndex.value = null
    const entry = entries.value.find((e) => e.id === selectedId.value)
    if (!entry) { loading.value = false; error.value = 'This case is unavailable. Choose an available study window.'; return }
    try {
      const data = parseCase(await readJson(entry.manifest, current.signal))
      if (current.signal.aborted) return
      if (data.id !== entry.id || data.dataKind !== entry.dataKind) throw new Error('Case identity or data label does not match the index.')
      activeCase.value = data
    } catch (e) {
      if (!current.signal.aborted) error.value = e instanceof Error ? e.message : 'Could not load the case.'
    } finally { if (!current.signal.aborted) loading.value = false }
  }
  async function initialize() {
    indexController?.abort(); controller?.abort()
    const current = new AbortController()
    indexController = current
    loading.value = true; error.value = ''; initialized = false
    try {
      const index = parseIndex(await readJson('/data/index.json', current.signal))
      if (current.signal.aborted || disposed) return
      entries.value = index
      if (!entries.value.length) { loading.value = false; return }
      if (!selectedId.value) selectedId.value = entries.value[0]!.id
      initialized = true
      await loadCase()
    } catch (e) { if (!current.signal.aborted && !disposed) { error.value = e instanceof Error ? e.message : 'Could not load available cases.'; loading.value = false } }
  }
  function focusCase() { focused.value = true; introVisible.value = false; focusVersion.value++ }
  function startStory() {
    if (!activeCase.value?.story.length) return
    focusCase(); storyIndex.value = 0; mode.value = activeCase.value.story[0]!.view
  }
  function moveStory(direction: number) {
    const data = activeCase.value
    if (!data || storyIndex.value === null) return
    const next = storyIndex.value + direction
    if (next >= data.story.length) { storyIndex.value = null; return }
    storyIndex.value = Math.max(0, next)
    mode.value = data.story[storyIndex.value]!.view
  }
  watch(selectedId, () => { if (initialized) { focusCase(); void loadCase() } }, { flush: 'sync' })
  watch([selectedId, mode], () => {
    const url = new URL(location.href)
    if (selectedId.value) url.searchParams.set('case', selectedId.value)
    url.searchParams.set('view', mode.value)
    history.replaceState(null, '', url)
  })
  onMounted(initialize)
  onUnmounted(() => { disposed = true; indexController?.abort(); controller?.abort() })
  return { entries, selectedId, activeCase, loading, error, mode, changeVisible, opacity, storyIndex, storyStep, sourcesOpen, panelOpen, introVisible, focused, focusVersion, query, filteredEntries, focusCase, startStory, moveStory, retry: () => entries.value.length ? loadCase() : initialize() }
}
