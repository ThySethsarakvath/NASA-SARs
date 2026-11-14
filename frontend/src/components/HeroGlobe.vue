<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { ACESFilmicToneMapping, AdditiveBlending, BackSide, BufferGeometry, Euler, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Scene, ShaderMaterial, SphereGeometry, SRGBColorSpace, TextureLoader, WebGLRenderer } from 'three'
import type { Texture } from 'three'
import { CAMBODIA, facingOrientation, geographicPoint } from '../globe/geography'
import { boundaryPositions } from '../globe/boundaries'
import { CAMBODIA_FLIGHT_MS, GLOBE_EXPANSION_MS, easeFlight, flightCameraDistance } from '../globe/flight'

const props = defineProps<{ paused: boolean; reducedMotion: boolean }>()
const container = ref<HTMLDivElement>()
const state = ref<'loading' | 'ready' | 'focusing' | 'focused' | 'static'>('loading')
const orientation = ref('')
const flightPhase = ref<'idle' | 'expanding' | 'zooming' | 'arrived'>('idle')
const cameraDistance = ref(3.8)
const fallbackImageFailed = ref(false)
const dragging = ref(false), northTilt = ref(0), outlineReady = ref(false)
const marker = ref({ left: 50, top: 50, visible: false })
let renderer: WebGLRenderer | undefined, scene: Scene, camera: PerspectiveCamera, earth: Group
let texture: Texture | undefined, resize: ResizeObserver | undefined, visibility: IntersectionObserver | undefined
let disposed = false, inView = true, lastFrame = 0, yaw = -2.9, pitch = 0
let flight: { start: number; from: Quaternion; target: Quaternion; resolve: () => void } | undefined
let settleTimer: number | undefined
let pointer: { id: number; x: number; y: number } | undefined
let northReset: { start: number; from: number } | undefined

function applyRotation() {
  earth.quaternion.setFromEuler(new Euler(pitch, yaw, 0, 'XYZ'))
  northTilt.value = Number(pitch.toFixed(4))
}
function resetNorth() {
  if (!earth || state.value !== 'ready') return
  if (props.reducedMotion) { pitch = 0; northReset = undefined; applyRotation() }
  else northReset = { start: performance.now(), from: pitch }
  syncAnimation()
}
function beginDrag(event: PointerEvent) {
  if (state.value !== 'ready' || event.button !== 0 || pointer) return
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
  container.value?.setPointerCapture(event.pointerId)
  dragging.value = true
  northReset = undefined
  syncAnimation()
}
function drag(event: PointerEvent) {
  if (!pointer || pointer.id !== event.pointerId) return
  const scale = Math.PI / Math.max(container.value?.clientWidth ?? 400, 1)
  yaw += (event.clientX - pointer.x) * scale
  pitch = Math.max(-1.2, Math.min(1.2, pitch + (event.clientY - pointer.y) * scale))
  pointer.x = event.clientX; pointer.y = event.clientY
  applyRotation()
  render()
}
function endDrag(event?: PointerEvent) {
  if (!pointer || (event && pointer.id !== event.pointerId)) return
  const id = pointer.id
  pointer = undefined
  if (container.value?.hasPointerCapture(id)) container.value.releasePointerCapture(id)
  dragging.value = false
  resetNorth()
}
function rotateWithKeys(event: KeyboardEvent) {
  if (state.value !== 'ready') return
  if (event.key === 'Home' || event.key.toLowerCase() === 'n') { event.preventDefault(); resetNorth(); return }
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
  event.preventDefault()
  northReset = undefined
  if (event.key === 'ArrowLeft') yaw -= .12
  if (event.key === 'ArrowRight') yaw += .12
  if (event.key === 'ArrowUp') pitch = Math.max(-1.2, pitch - .12)
  if (event.key === 'ArrowDown') pitch = Math.min(1.2, pitch + .12)
  applyRotation()
  render()
}
function finishKeys(event: KeyboardEvent) {
  if (event.key.startsWith('Arrow')) resetNorth()
}
const geometries: BufferGeometry[] = []
const materials: (MeshBasicMaterial | LineBasicMaterial | ShaderMaterial)[] = []
const assetController = new AbortController()

function render() {
  if (!renderer || !earth || disposed || state.value === 'static') return
  scene.updateMatrixWorld(true)
  const location = geographicPoint(CAMBODIA.latitude, CAMBODIA.longitude, 1.012).applyQuaternion(earth.quaternion)
  const point = location.clone().project(camera)
  marker.value = { left: (point.x + 1) * 50, top: (1 - point.y) * 50, visible: location.z > .2 && (state.value === 'focusing' || state.value === 'focused') }
  cameraDistance.value = Number(camera.position.z.toFixed(3))
  orientation.value = earth.quaternion.toArray().map((value) => value.toFixed(4)).join(',')
  renderer.render(scene, camera)
}
function animate(time: number) {
  if (time - lastFrame < 1000 / 30) return
  const elapsed = Math.min((time - lastFrame) / 1000, .06)
  lastFrame = time
  if (flight) {
    const elapsedFlight = time - flight.start
    const progress = Math.min(elapsedFlight / CAMBODIA_FLIGHT_MS, 1)
    earth.quaternion.slerpQuaternions(flight.from, flight.target, easeFlight(elapsedFlight / 1450))
    camera.position.z = flightCameraDistance(elapsedFlight, camera.aspect)
    flightPhase.value = elapsedFlight < GLOBE_EXPANSION_MS ? 'expanding' : 'zooming'
    if (progress === 1) {
      const complete = flight.resolve
      flight = undefined
      state.value = 'focused'
      flightPhase.value = 'arrived'
      settleTimer = window.setTimeout(complete, 180)
    }
  } else if (northReset) {
    const progress = Math.min((time - northReset.start) / 650, 1)
    pitch = northReset.from * (1 - progress) ** 3
    applyRotation()
    if (progress === 1) { northReset = undefined; syncAnimation() }
  } else if (state.value === 'ready' && !dragging.value && !props.paused && !props.reducedMotion) {
    yaw += elapsed * .085
    applyRotation()
  }
  render()
  if (state.value === 'focused') syncAnimation()
}
function syncAnimation() {
  if (!renderer || disposed || state.value === 'loading' || state.value === 'static') return
  const run = inView && !document.hidden && (!!flight || !!northReset || (state.value === 'ready' && !dragging.value && !props.paused && !props.reducedMotion))
  lastFrame = performance.now()
  renderer.setAnimationLoop(run ? animate : null)
  render()
}
function focusCambodia(): Promise<void> {
  if (!renderer || !earth || state.value === 'loading' || state.value === 'static') return Promise.resolve()
  if (flight) return Promise.resolve()
  endDrag()
  northReset = undefined
  const target = facingOrientation(CAMBODIA.latitude, CAMBODIA.longitude)
  if (props.reducedMotion) {
    earth.quaternion.copy(target)
    state.value = 'focused'
    syncAnimation()
    return Promise.resolve()
  }
  state.value = 'focusing'
  flightPhase.value = 'expanding'
  return new Promise((resolve) => {
    flight = { start: performance.now(), from: earth.quaternion.clone(), target, resolve }
    syncAnimation()
  })
}
defineExpose({ focusCambodia, resetNorth, canFly: () => state.value === 'ready' })

function loseContext(event: Event) {
  event.preventDefault()
  if (disposed) return
  renderer?.setAnimationLoop(null)
  state.value = 'static'
  flight?.resolve(); flight = undefined
}

watch(() => [props.paused, props.reducedMotion], () => {
  if (props.reducedMotion && earth) {
    if (flight) { const complete = flight.resolve; earth.quaternion.copy(flight.target); camera.position.z = flightCameraDistance(CAMBODIA_FLIGHT_MS, camera.aspect); flight = undefined; state.value = 'focused'; flightPhase.value = 'arrived'; complete() }
    else if (northReset) { northReset = undefined; pitch = 0; applyRotation() }
  }
  syncAnimation()
})
onMounted(async () => {
  if (!container.value) return
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    renderer.domElement.addEventListener('webglcontextlost', loseContext)
    container.value.append(renderer.domElement)
    scene = new Scene()
    camera = new PerspectiveCamera(35, 1, .1, 30)
    camera.position.set(0, 0, 3.8)
    camera.lookAt(0, 0, 0)
    earth = new Group()
    if (props.reducedMotion) { pitch = CAMBODIA.latitude * Math.PI / 180; yaw = -Math.PI / 2 - CAMBODIA.longitude * Math.PI / 180 }
    applyRotation()
    scene.add(earth)
    const geometry = new SphereGeometry(1, 80, 56)
    const surface = new ShaderMaterial({
      uniforms: { earthMap: { value: null } },
      vertexShader: 'varying vec2 mapUv; varying vec3 normalView; varying vec3 positionView; void main(){ mapUv=uv; normalView=normalize(normalMatrix*normal); vec4 p=modelViewMatrix*vec4(position,1.0); positionView=p.xyz; gl_Position=projectionMatrix*p; }',
      fragmentShader: 'uniform sampler2D earthMap; varying vec2 mapUv; varying vec3 normalView; varying vec3 positionView; void main(){ vec3 tex=texture2D(earthMap,mapUv).rgb; float luma=dot(tex,vec3(0.2126,0.7152,0.0722)); float facing=max(dot(normalize(normalView),normalize(-positionView)),0.0); vec3 ink=mix(vec3(0.012,0.018,0.022),vec3(0.10,0.12,0.13),luma); gl_FragColor=vec4(ink*(0.65+0.35*facing),1.0); }',
    })
    geometries.push(geometry); materials.push(surface)
    earth.add(new Mesh(geometry, surface))

    const atmosphereGeometry = new SphereGeometry(1.018, 64, 48)
    const atmosphere = new ShaderMaterial({
      transparent: true, depthWrite: false, side: BackSide, blending: AdditiveBlending,
      vertexShader: 'varying vec3 normalView; varying vec3 positionView; void main(){ normalView=normalize(normalMatrix*normal); vec4 p=modelViewMatrix*vec4(position,1.0); positionView=p.xyz; gl_Position=projectionMatrix*p; }',
      fragmentShader: 'varying vec3 normalView; varying vec3 positionView; void main(){ float rim=pow(1.0-abs(dot(normalize(normalView),normalize(-positionView))),3.0); gl_FragColor=vec4(0.25,0.32,0.35,rim*0.25); }',
    })
    geometries.push(atmosphereGeometry); materials.push(atmosphere)
    earth.add(new Mesh(atmosphereGeometry, atmosphere))
    resize = new ResizeObserver(() => {
      if (!container.value || !renderer) return
      const { width, height } = container.value.getBoundingClientRect()
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      render()
    })
    resize.observe(container.value)
    visibility = new IntersectionObserver(([entry]) => { inView = entry?.isIntersecting ?? false; syncAnimation() })
    visibility.observe(container.value)
    document.addEventListener('visibilitychange', syncAnimation)
    const [loaded, cambodia, outlines] = await Promise.all([
      new TextureLoader().loadAsync('/images/earth-blue-marble.jpg').then((loaded) => { if (disposed) loaded.dispose(); else texture = loaded; return loaded }),
      fetch('/globe/cambodia.json', { signal: assetController.signal }).then(async (response): Promise<unknown> => { if (!response.ok) throw new Error('Cambodia outline unavailable'); return response.json() }),
      fetch('/globe/boundaries.json', { signal: assetController.signal }).then(async (response): Promise<unknown> => { if (!response.ok) throw new Error('Country outlines unavailable'); return response.json() }),
    ])
    if (disposed) return
    texture = loaded
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4)
    surface.uniforms.earthMap!.value = texture
    const borders = new BufferGeometry()
    borders.setAttribute('position', new Float32BufferAttribute(boundaryPositions(outlines), 3))
    const ink = new LineBasicMaterial({ color: '#63747b', transparent: true, opacity: .47 })
    geometries.push(borders); materials.push(ink)
    earth.add(new LineSegments(borders, ink))
    const countryBorder = new BufferGeometry()
    countryBorder.setAttribute('position', new Float32BufferAttribute(boundaryPositions(cambodia), 3))
    const highlight = new LineBasicMaterial({ color: '#a0e0cc', depthWrite: false })
    geometries.push(countryBorder); materials.push(highlight)
    const countryOutline = new LineSegments(countryBorder, highlight)
    // Draw over the matching world border without offsetting it during close-up zoom.
    countryOutline.renderOrder = 1
    earth.add(countryOutline)
    outlineReady.value = true
    state.value = 'ready'
    syncAnimation()
  } catch {
    if (!disposed) { state.value = 'static'; renderer?.setAnimationLoop(null) }
  }
})
onUnmounted(() => {
  endDrag()
  disposed = true
  assetController.abort()
  window.clearTimeout(settleTimer)
  flight?.resolve(); flight = undefined
  resize?.disconnect(); visibility?.disconnect()
  document.removeEventListener('visibilitychange', syncAnimation)
  renderer?.domElement.removeEventListener('webglcontextlost', loseContext)
  renderer?.setAnimationLoop(null)
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  texture?.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()
})
</script>

<template>
  <div class="hero-earth" :data-globe-state="state" :data-orientation="orientation" :data-flight-phase="flightPhase" :data-camera-distance="cameraDistance" :data-north-tilt="northTilt" :data-cambodia-outline="outlineReady" :data-motion="paused || reducedMotion ? 'paused' : 'playing'" role="group" aria-label="Interactive Earth globe">
    <div class="hero-earth-halo" aria-hidden="true" />
    <div ref="container" class="hero-earth-canvas" :class="{ 'is-hidden': state === 'static', 'is-dragging': dragging }" :tabindex="state === 'ready' ? 0 : -1" role="img" aria-label="Rotate Earth. Drag or use arrow keys; release to return north up. Press N to reset north." @pointerdown="beginDrag" @pointermove="drag" @pointerup="endDrag" @pointercancel="endDrag" @lostpointercapture="endDrag" @keydown="rotateWithKeys" @keyup="finishKeys" @blur="resetNorth" />
    <div v-if="state === 'static'" class="hero-earth-fallback"><img v-if="!fallbackImageFailed" src="/images/earth-blue-marble.jpg" alt="NASA Blue Marble historical global map" @error="fallbackImageFailed = true" /><span>{{ fallbackImageFailed ? 'Earth imagery unavailable · continue to the explorer' : 'Static Earth view · 3D unavailable' }}</span></div>
    <span v-if="state === 'loading'" class="hero-earth-loading">Preparing our Earth…</span>
    <span v-if="marker.visible" class="hero-country-label" :style="{ left: `${marker.left}%`, top: `${marker.top}%` }">CAMBODIA</span>
  </div>
</template>
