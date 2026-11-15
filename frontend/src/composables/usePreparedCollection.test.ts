import { defineComponent, shallowRef } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import raw from '../../public/data/tonle-sap-2026/case.json?raw'
import { parseCase } from '../data/contract'
import { usePreparedCollection } from './usePreparedCollection'

function harness(data = parseCase(JSON.parse(raw))) {
  let state!: ReturnType<typeof usePreparedCollection>
  const wrapper = mount(defineComponent({ setup() {
    state = usePreparedCollection(shallowRef(data))
    return () => null
  } }))
  return { wrapper, state }
}
beforeEach(() => history.replaceState(null, '', '/?page=explore&case=tonle-sap-2026'))
describe('Prepared collection selection', () => {
  it('disables the first-to-last change output for intermediate pairs and preserves radar provenance', async () => {
    const { state, wrapper } = harness()
    expect(state.data.value?.change).toBeDefined()
    state.beforeDate.value = '2026-07-01'
    state.representation.value = 'radar'
    await flushPromises()
    expect(state.data.value?.change).toBeUndefined()
    expect(state.data.value?.before.image).toContain('sar_20260701.png')
    expect(state.data.value?.before.inputId).toContain('sar_20260701.png')
    expect(location.search).toContain('from=2026-07-01')
    expect(location.search).toContain('display=radar')
    wrapper.unmount()
  })
  it('restores a valid shared view and replaces reversed URL dates with the full supplied period', () => {
    history.replaceState(null, '', '/?from=2026-07-01&to=2026-10-05&layer=frequency')
    const first = harness()
    expect(first.state.beforeDate.value).toBe('2026-07-01')
    expect(first.state.layer.value?.id).toBe('frequency')
    first.wrapper.unmount()
    history.replaceState(null, '', '/?from=2026-10-29&to=2026-06-19')
    const second = harness()
    expect(second.state.beforeDate.value).toBe('2026-06-19')
    expect(second.state.afterDate.value).toBe('2026-10-29')
    second.wrapper.unmount()
  })
  it('selects the lowest earlier open-water date and high-water date with radar context', async () => {
    const { state, wrapper } = harness()
    state.compareLowHigh()
    await flushPromises()
    expect(state.beforeDate.value).toBe('2026-07-01')
    expect(state.afterDate.value).toBe('2026-10-05')
    expect(state.data.value?.before.backgroundImage).toContain('sar_20260701.png')
    expect(state.data.value?.after.image).toContain('water_20261005.png')
    expect(state.data.value?.change).toBeUndefined()
    expect(location.search).toContain('display=both')
    wrapper.unmount()
  })
  it('restores the baseline filter and never silently substitutes a missing orange layer', async () => {
    history.replaceState(null, '', '/?from=2026-06-19&to=2026-10-29&display=both&baseline=rare-water')
    const source = parseCase(JSON.parse(raw))
    source.collection!.observations[0]!.unusualImage = undefined
    const { state, wrapper } = harness(source)
    expect(state.baselineOnly.value).toBe(true)
    expect(state.selectionError.value).toContain('unavailable')
    expect(state.data.value).toBeNull()
    state.baselineOnly.value = false
    await flushPromises()
    expect(state.data.value?.before.image).toContain('water_20260619.png')
    expect(location.search).not.toContain('baseline=')
    wrapper.unmount()
  })

})
