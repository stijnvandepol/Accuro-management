import { defineStore } from 'pinia'
import { ref } from 'vue'

interface ToastMessage {
  severity: 'success' | 'info' | 'warn' | 'error'
  summary: string
  detail?: string
  life?: number
}

export const useToastStore = defineStore('toast', () => {
  const messages = ref<ToastMessage[]>([])

  function add(msg: ToastMessage) {
    messages.value.push({ life: 3000, ...msg })
  }

  function success(summary: string, detail?: string) {
    add({ severity: 'success', summary, detail })
  }

  function error(summary: string, detail?: string) {
    add({ severity: 'error', summary, detail, life: 5000 })
  }

  function clear() {
    messages.value = []
  }

  return { messages, add, success, error, clear }
})
