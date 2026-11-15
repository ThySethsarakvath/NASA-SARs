import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { useAgriculture } from './useAgriculture'
import { summaryFixture, vegetationFixture, rainfallFixture, geometryFixture } from '../../tests/fixtures/agriculture'

function response(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status }) }
function harness() {
  let state!: ReturnType<typeof useAgriculture>
  const wrapper = mount(defineComponent({ setup() { state = useAgriculture(); return () => null } }))
  return { state, wrapper }
}
beforeEach(() => history.replaceState(null, '', '/?page=agriculture'))
afterEach(() => vi.unstubAllGlobals())

describe('Agriculture resource ownership', () => {
  it('makes the summary and charts usable while optional geometry is still loading', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string, init: RequestInit) => {
      if (input.endsWith('/summary')) return response(summaryFixture())
      if (input.endsWith('.geojson')) return new Promise<Response>((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
      if (input.includes('/vegetation?')) return response(vegetationFixture('Siem Reap'))
      return response([])
    }))
    const { state, wrapper } = harness(); await flushPromises(); await flushPromises()
    expect(state.geometry.loading).toBe(true)
    expect(state.summary.loading).toBe(false)
    expect(state.selected.value?.province).toBe('Siem Reap')
    expect(state.vegetation.data?.[0]?.date).toBe('2021-01-01')
    wrapper.unmount()
  })
  it('loads independent resources, preserves empty vegetation and updates province URLs', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input), province = url.searchParams.get('province') ?? ''
      if (url.pathname.endsWith('/summary')) return response(summaryFixture())
      if (url.pathname.endsWith('.geojson')) return response(geometryFixture())
      if (url.pathname.endsWith('/changes')) return response([], 503)
      if (url.pathname.endsWith('/vegetation')) return response(province === 'Battambang' ? [] : vegetationFixture(province))
      return response(rainfallFixture(province))
    }))
    const { state, wrapper } = harness(); await flushPromises(); await flushPromises()
    expect(state.selected.value?.province).toBe('Siem Reap')
    expect(state.vegetation.data?.[0]?.date).toBe('2021-01-01')
    expect(state.changes.error).toContain('not available')
    expect(state.summary.error).toBe('')
    state.selectedProvince.value = 'Battambang'; await flushPromises()
    expect(state.vegetation.data).toEqual([])
    expect(state.rainfall.data?.[0]?.province).toBe('Battambang')
    expect(location.search).toContain('province=Battambang')
    wrapper.unmount()
  })
  it('does not let a late response replace the newly selected province', async () => {
    let resolveOld: ((r: Response) => void) | undefined
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input), province = url.searchParams.get('province') ?? ''
      if (url.pathname.endsWith('/summary')) return response(summaryFixture())
      if (url.pathname.endsWith('.geojson')) return response(geometryFixture())
      if (url.pathname.endsWith('/changes')) return response([])
      if (url.pathname.endsWith('/vegetation') && province === 'Siem Reap') return new Promise<Response>((resolve) => { resolveOld = resolve })
      if (url.pathname.endsWith('/vegetation')) return response(vegetationFixture(province))
      return response(rainfallFixture(province))
    }))
    const { state, wrapper } = harness(); await flushPromises()
    state.selectedProvince.value = 'Battambang'; await flushPromises()
    resolveOld?.(response(vegetationFixture('Siem Reap'))); await flushPromises()
    expect(state.vegetation.data?.[0]?.province).toBe('Battambang')
    expect(state.vegetation.loading).toBe(false)
    wrapper.unmount()
  })
  it('shows a recoverable error for a failed summary without substituting fixture data', async () => {
    let fail = true
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      if (input.endsWith('/summary')) return fail ? response({}, 500) : response(summaryFixture())
      if (input.endsWith('.geojson')) return response(geometryFixture())
      return response([])
    }))
    const { state, wrapper } = harness(); await flushPromises()
    expect(state.summary.data).toBeNull(); expect(state.summary.error).toContain('HTTP 500')
    fail = false; await state.reload(); await flushPromises()
    expect(state.summary.data?.provinces).toHaveLength(2)
    expect(state.summary.error).toBe('')
    wrapper.unmount()
  })
})
