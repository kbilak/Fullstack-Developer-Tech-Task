import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchBar from '@/components/common/SearchBar.vue'

describe('SearchBar', () => {
  it('renders with default placeholder', () => {
    const wrapper = mount(SearchBar, {
      props: { modelValue: '' },
    })

    const input = wrapper.find('input')
    expect(input.attributes('placeholder')).toBe('Search...')
  })

  it('renders with custom placeholder', () => {
    const wrapper = mount(SearchBar, {
      props: { modelValue: '', placeholder: 'Find stores...' },
    })

    const input = wrapper.find('input')
    expect(input.attributes('placeholder')).toBe('Find stores...')
  })

  it('displays the modelValue in the input', () => {
    const wrapper = mount(SearchBar, {
      props: { modelValue: 'test query' },
    })

    const input = wrapper.find('input')
    expect((input.element as HTMLInputElement).value).toBe('test query')
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(SearchBar, {
      props: { modelValue: '' },
    })

    const input = wrapper.find('input')
    await input.setValue('hello')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['hello'])
  })

  it('shows clear button when modelValue is not empty', () => {
    const wrapper = mount(SearchBar, {
      props: { modelValue: 'something' },
    })

    const clearBtn = wrapper.find('button')
    expect(clearBtn.exists()).toBe(true)
  })

  it('hides clear button when modelValue is empty', () => {
    const wrapper = mount(SearchBar, {
      props: { modelValue: '' },
    })

    const clearBtn = wrapper.find('button')
    expect(clearBtn.exists()).toBe(false)
  })

  it('emits empty string on clear button click', async () => {
    const wrapper = mount(SearchBar, {
      props: { modelValue: 'test' },
    })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([''])
  })

  it('has search icon', () => {
    const wrapper = mount(SearchBar, {
      props: { modelValue: '' },
    })

    const icon = wrapper.find('i.pi-search')
    expect(icon.exists()).toBe(true)
  })
})
