import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AgricultureChart from './AgricultureChart.vue'

describe('Agriculture chart evidence', () => {
  it('breaks the line at missing months and exposes missing values in the data table', () => {
    const wrapper = mount(AgricultureChart, { props: { title: 'NDVI', unit: 'index', rows: [{ date: '2021-01-01', value: .4 }, { date: '2021-02-01', value: null }, { date: '2021-03-01', value: .5 }] } })
    const path = wrapper.find('path').attributes('d')!
    expect(path.match(/M/g)).toHaveLength(2); expect(path).not.toContain('L')
    expect(wrapper.find('svg title').text()).toContain('2021-01-01 to 2021-03-01')
    expect(wrapper.find('tbody').text()).toContain('Not supplied')
  })
})
