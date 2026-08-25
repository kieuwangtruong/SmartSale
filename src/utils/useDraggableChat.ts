import { computed, onBeforeUnmount, ref, type Ref } from 'vue'

export interface VerticalDraggableOptions {
  defaultBottom?: number
  defaultRight?: number
  buttonHeight?: number
  padding?: number
}

export function useVerticalDraggableChat(
  buttonRef?: Ref<HTMLElement | null>,
  options: VerticalDraggableOptions = {}
) {
  const {
    defaultBottom = 24,
    defaultRight = 24,
    buttonHeight = 56,
    padding = 20,
  } = options

  // bottom offset in px
  const bottomPx = ref<number | null>(null)
  const isDragging = ref(false)
  const startPointerY = ref(0)
  const initialBottom = ref(defaultBottom)
  const hasMovedSignificantly = ref(false)

  const isCustomPositioned = computed(() => bottomPx.value !== null)

  const currentBottom = computed(() => bottomPx.value ?? defaultBottom)

  const dragStyle = computed(() => {
    return {
      bottom: `${currentBottom.value}px`,
      right: `${defaultRight}px`,
    }
  })

  function getClientY(e: MouseEvent | TouchEvent | PointerEvent): number {
    if ('touches' in e && e.touches.length > 0 && e.touches[0]) {
      return e.touches[0].clientY
    }
    if ('clientY' in e) {
      return e.clientY
    }
    return 0
  }

  function clampBottom(bottom: number): number {
    const minBottom = padding
    const maxBottom = Math.max(minBottom, window.innerHeight - buttonHeight - padding)
    return Math.min(Math.max(minBottom, bottom), maxBottom)
  }

  function startDrag(e: MouseEvent | TouchEvent | PointerEvent) {
    if ('button' in e && e.button !== 0) return
    const target = e.target as HTMLElement | null
    if (target && (target.closest('input') || target.closest('textarea') || target.closest('a'))) {
      return
    }

    startPointerY.value = getClientY(e)
    initialBottom.value = currentBottom.value
    hasMovedSignificantly.value = false
    isDragging.value = true

    window.addEventListener('mousemove', onDragMove, { passive: false })
    window.addEventListener('mouseup', onDragEnd)
    window.addEventListener('touchmove', onDragMove, { passive: false })
    window.addEventListener('touchend', onDragEnd)
    window.addEventListener('touchcancel', onDragEnd)
    window.addEventListener('pointermove', onDragMove, { passive: false })
    window.addEventListener('pointerup', onDragEnd)
  }

  function onDragMove(e: MouseEvent | TouchEvent | PointerEvent) {
    if (!isDragging.value) return

    const clientY = getClientY(e)
    const deltaY = startPointerY.value - clientY // moving up increases bottom

    if (Math.abs(deltaY) > 3) {
      hasMovedSignificantly.value = true
    }

    if (hasMovedSignificantly.value) {
      if (e.cancelable) {
        e.preventDefault()
      }
      bottomPx.value = clampBottom(initialBottom.value + deltaY)
    }
  }

  function onDragEnd() {
    isDragging.value = false
    window.removeEventListener('mousemove', onDragMove)
    window.removeEventListener('mouseup', onDragEnd)
    window.removeEventListener('touchmove', onDragMove)
    window.removeEventListener('touchend', onDragEnd)
    window.removeEventListener('touchcancel', onDragEnd)
    window.removeEventListener('pointermove', onDragMove)
    window.removeEventListener('pointerup', onDragEnd)
  }

  function resetPosition() {
    bottomPx.value = null
  }

  function handleResize() {
    if (bottomPx.value !== null) {
      bottomPx.value = clampBottom(bottomPx.value)
    }
  }

  window.addEventListener('resize', handleResize)

  onBeforeUnmount(() => {
    onDragEnd()
    window.removeEventListener('resize', handleResize)
  })

  return {
    isDragging,
    hasMovedSignificantly,
    bottomPx,
    currentBottom,
    isCustomPositioned,
    dragStyle,
    startDrag,
    resetPosition,
  }
}
