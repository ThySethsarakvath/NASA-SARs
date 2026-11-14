import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as contract from '../data/contract'
import rawFixture from '../../public/data/synthetic-tonle-sap/case.json?raw'
import { useExplorer } from './useExplorer'

const fixture = JSON.parse(rawFixture) as Record<string, unknown>
const entry = (id: string) => ({ id, title: id, location: 'Illustrative location', manifest: `/data/${id}/case.json`, dataKind: 'synthetic-demo' })
function harness() {
  let state!: ReturnType<typeof useExplorer>
  const wrapper = mount(defineComponent({ setup() { state = useExplorer(); return () => null } }))
  return { wrapper, state }
}
beforeEach(() => history.replaceState(null, '', '/'))
afterEach(() => vi.restoreAllMocks())

describe('Case request ownership', () => {
  it('cancels an initial case and disregards its late response after selection changes', async () => {
    let finishFirst!: (value: unknown) => void
    let firstSignal: AbortSignal | undefined
    vi.spyOn(contract, 'readJson').mockImplementation((url, signal) => {
      if (url === '/data/index.json') return Promise.resolve({ cases: [entry('first'), entry('second')] })
      if (url === '/data/first/case.json') {
        firstSignal = signal
        return new Promise((resolve) => { finishFirst = resolve })
      }
      return Promise.resolve({ ...fixture, id: 'second', title: 'Second selected case' })
    })
    const { wrapper, state } = harness()
    await flushPromises()
    state.selectedId.value = 'second'
    await flushPromises()
    expect(firstSignal?.aborted).toBe(true)
    expect(state.activeCase.value?.id).toBe('second')
    finishFirst({ ...fixture, id: 'first' })
    await flushPromises()
    expect(state.activeCase.value?.id).toBe('second')
    expect(state.loading.value).toBe(false)
    expect(location.search).toContain('case=second')
    wrapper.unmount()
  })
  it('aborts index loading on unmount and does not start a later case request', async () => {
    let finishIndex!: (value: unknown) => void
    let indexSignal: AbortSignal | undefined
    const read = vi.spyOn(contract, 'readJson').mockImplementation((_url, signal) => {
      indexSignal = signal
      return new Promise((resolve) => { finishIndex = resolve })
    })
    const { wrapper, state } = harness()
    wrapper.unmount()
    expect(indexSignal?.aborted).toBe(true)
    finishIndex({ cases: [entry('first')] })
    await flushPromises()
    expect(read).toHaveBeenCalledTimes(1)
    expect(state.entries.value).toEqual([])
  })
  it('represents an empty index as unavailable coverage rather than zero change', async () => {
    vi.spyOn(contract, 'readJson').mockResolvedValue({ cases: [] })
    const { wrapper, state } = harness()
    await flushPromises()
    expect(state.entries.value).toEqual([])
    expect(state.activeCase.value).toBeNull()
    expect(state.loading.value).toBe(false)
    expect(state.error.value).toBe('')
    wrapper.unmount()
  })
})
