import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TabNav from '@/components/common/TabNav.vue'

const tabs = [
  { id: 'stores', label: 'Stores', icon: 'pi pi-shop' },
  { id: 'entries', label: 'Entries', icon: 'pi pi-list' },
]

describe('TabNav', () => {
  it('renders all tabs', () => {
    const wrapper = mount(TabNav, {
      props: { tabs, modelValue: 'stores' },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]!.text()).toContain('Stores')
    expect(buttons[1]!.text()).toContain('Entries')
  })

  it('applies active class to the selected tab', () => {
    const wrapper = mount(TabNav, {
      props: { tabs, modelValue: 'stores' },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons[0]!.classes()).toContain('bg-gray-900')
    expect(buttons[0]!.classes()).toContain('text-white')
    expect(buttons[1]!.classes()).not.toContain('bg-gray-900')
  })

  it('applies active class to the other tab when modelValue changes', () => {
    const wrapper = mount(TabNav, {
      props: { tabs, modelValue: 'entries' },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons[1]!.classes()).toContain('bg-gray-900')
    expect(buttons[0]!.classes()).not.toContain('bg-gray-900')
  })

  it('emits update:modelValue on tab click', async () => {
    const wrapper = mount(TabNav, {
      props: { tabs, modelValue: 'stores' },
    })

    await wrapper.findAll('button')[1]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['entries'])
  })

  it('renders icons when provided', () => {
    const wrapper = mount(TabNav, {
      props: { tabs, modelValue: 'stores' },
    })

    const icons = wrapper.findAll('i')
    expect(icons.length).toBe(2)
  })

  it('renders count badge when provided', () => {
    const tabsWithCount = [
      { id: 'stores', label: 'Stores', count: 12 },
      { id: 'entries', label: 'Entries' },
    ]

    const wrapper = mount(TabNav, {
      props: { tabs: tabsWithCount, modelValue: 'stores' },
    })

    expect(wrapper.text()).toContain('12')
  })

  it('does not render count badge when count is undefined', () => {
    const wrapper = mount(TabNav, {
      props: { tabs, modelValue: 'stores' },
    })

    // Only tab labels and no count badges
    const spans = wrapper.findAll('span')
    // 2 label spans, no count spans
    expect(spans).toHaveLength(2)
  })
})
