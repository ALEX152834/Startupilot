import { ref, onUnmounted } from 'vue'
import { onUnload } from '@dcloudio/uni-app'

/**
 * Marks component alive state and guards async callbacks after unmount/unload.
 * @returns {{ isAlive: import('vue').Ref<boolean>, safeRun: (fn: Function) => any }}
 */
export function useSafeAsync() {
  const isAlive = ref(true)

  const markDead = () => {
    isAlive.value = false
  }

  const safeRun = (fn) => {
    if (!isAlive.value || typeof fn !== 'function') {
      return
    }
    return fn()
  }

  onUnmounted(markDead)
  onUnload(markDead)

  return {
    isAlive,
    safeRun
  }
}
