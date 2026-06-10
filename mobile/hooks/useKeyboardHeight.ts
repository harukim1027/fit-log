/**
 * @file hooks/useKeyboardHeight.ts
 * @description 소프트 키보드 높이를 실시간으로 추적하는 훅
 *
 * iOS/Android별로 이벤트명이 다르다:
 * - iOS: keyboardWillShow/Hide — 애니메이션 시작 시점에 발생 (UX 더 자연스러움)
 * - Android: keyboardDidShow/Hide — 키보드가 완전히 올라온 후 발생
 *
 * 사용 예시:
 *   const keyboardHeight = useKeyboardHeight()
 *   // paddingBottom: keyboardHeight + 20
 */

import { useState, useEffect } from 'react'
import { Keyboard, KeyboardEvent, Platform } from 'react-native'

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    // iOS는 Will 이벤트를 써서 키보드 올라오는 애니메이션과 동기화
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const show = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height)
    })
    const hide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0)
    })

    // 언마운트 시 리스너 해제 — 메모리 누수 방지
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  return keyboardHeight
}
