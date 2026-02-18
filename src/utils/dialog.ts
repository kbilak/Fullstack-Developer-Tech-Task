/** Shared PrimeVue Dialog passthrough styles for all modal dialogs. */
export const dialogPt = {
  root: { class: 'rounded-2xl! max-w-[calc(100vw-2rem)]!' },
  header: { class: 'border-b border-gray-100 px-6! py-4!' },
  content: { class: 'px-6! py-5!' },
  footer: { class: 'border-t border-gray-100 px-6! py-4!' },
}

/** Dialog passthrough without footer border (for dialogs without a styled footer). */
export const dialogPtNoFooter = {
  root: { class: 'rounded-2xl! max-w-[calc(100vw-2rem)]!' },
  header: { class: 'border-b border-gray-100 px-6! py-4!' },
  content: { class: 'px-6! py-5!' },
}
