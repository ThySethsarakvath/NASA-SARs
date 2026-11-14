import { defineComponent, shallowRef } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import raw from '../../public/data/tonle-sap-2026/case.json?raw'
import { parseCase } from '../data/contract'
import { usePreparedCollection } from './usePreparedCollection'

function harness() {
  let state!: ReturnType<typeof usePreparedCollection>
  const wrapper = mount(defineComponent({ setup() {
    state = usePreparedCollection(shallowRef(parseCase(JSON.parse(raw))))
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
})
