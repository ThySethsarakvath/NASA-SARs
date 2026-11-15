import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import raw from '../../public/data/tonle-sap-2026/case.json?raw'
import { parseCase } from '../data/contract'
import ExposureSummary from './ExposureSummary.vue'

describe('Exposure date and scope', () => {
  it('follows the visible date, then switches to the matching baseline-filtered estimates', async () => {
    const data = parseCase(JSON.parse(raw))
    const wrapper = mount(ExposureSummary, { props: { data, mode: 'before', baselineOnly: false, aggregate: false } })
    expect(wrapper.find('[data-metric="areaKm2"]').text()).toContain('3,194.4')
    await wrapper.setProps({ mode: 'after' })
    expect(wrapper.find('[data-metric="areaKm2"]').text()).toContain('7,348.6')
    await wrapper.setProps({ baselineOnly: true })
    expect(wrapper.find('[data-metric="areaKm2"]').text()).toContain('502')
    expect(wrapper.text()).toContain('not a season-matched anomaly')
  })
  it('does not show peak-date figures on a season summary, or convert missing population into zero', async () => {
    const data = parseCase(JSON.parse(raw))
    data.collection!.exposure!.records.at(-1)!.classifiedWater.population = null
    const wrapper = mount(ExposureSummary, { props: { data, mode: 'after', baselineOnly: false, aggregate: false } })
    expect(wrapper.find('[data-metric="population"]').text()).toContain('Not supplied')
    await wrapper.setProps({ aggregate: true })
    expect(wrapper.findAll('.exposure-metric')).toHaveLength(0)
    expect(wrapper.text()).toContain('Choose a dated view')
  })
})
