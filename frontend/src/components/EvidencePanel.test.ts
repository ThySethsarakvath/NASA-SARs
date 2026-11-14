import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import rawFixture from '../../public/data/synthetic-tonle-sap/case.json?raw'
import { parseCase } from '../data/contract'
import EvidencePanel from './EvidencePanel.vue'
import ComparisonControls from './ComparisonControls.vue'

describe('Evidence and observation controls', () => {
  it('shows illustrative dates and limitations, then exposes actual method metadata', async () => {
    const data = parseCase(JSON.parse(rawFixture) as unknown)
    const panel = mount(EvidencePanel, { props: { data, open: true, loading: false } })
    expect(panel.text()).toContain('Illustrative dates, not satellite acquisitions.')
    expect(panel.text()).toContain('No real NISAR acquisitions are included.')
    const method = panel.findAll('button').find((button) => button.text() === 'Data & method')!
    await method.trigger('click')
    expect(panel.text()).toContain('None — synthetic development graphics')
    expect(panel.text()).toContain('synthetic-frame-a')
    panel.unmount()
  })
  it('disables comparison and change controls when imagery is unavailable', () => {
    const data = parseCase(JSON.parse(rawFixture) as unknown)
    const controls = mount(ComparisonControls, { props: { data, ready: false, mode: 'before', changeVisible: false, opacity: 75 } })
    expect(controls.findAll('button').every((button) => button.attributes('disabled') !== undefined)).toBe(true)
    expect(controls.get('input[type="checkbox"]').attributes('disabled')).toBeDefined()
    controls.unmount()
  })
  it('does not expose the change switch when no analysis layer was supplied', () => {
    const data = parseCase({ ...(JSON.parse(rawFixture) as object), change: undefined })
    const controls = mount(ComparisonControls, { props: { data, ready: true, mode: 'before', changeVisible: false, opacity: 75 } })
    expect(controls.get('input[type="checkbox"]').attributes('disabled')).toBeDefined()
    expect(controls.get('button').attributes('disabled')).toBeUndefined()
    controls.unmount()
  })
})
