import { renderHook, act } from '@testing-library/react-native';
import { Keyboard } from 'react-native';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';

// jest 환경에서 Keyboard.emit이 없으므로, addListener를 spy해서 콜백을 직접 호출
type Callback = (...args: any[]) => void;
const listeners = new Map<string, Callback[]>();

jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: any, callback: any) => {
  const list = listeners.get(event) ?? [];
  list.push(callback);
  listeners.set(event, list);
  return {
    remove: jest.fn(() => {
      const updated = (listeners.get(event) ?? []).filter((fn) => fn !== callback);
      listeners.set(event, updated);
    }),
  };
}) as any);

function emitKeyboard(event: string, data: object = {}) {
  (listeners.get(event) ?? []).forEach((fn) => fn(data));
}

// Jest 환경에서 Platform.OS = 'ios' → keyboardWill* 이벤트 사용
const SHOW_EVENT = 'keyboardWillShow';
const HIDE_EVENT = 'keyboardWillHide';

describe('useKeyboardHeight', () => {
  beforeEach(() => {
    listeners.clear();
  });

  it('초기값 0', () => {
    const { result } = renderHook(() => useKeyboardHeight());
    expect(result.current).toBe(0);
  });

  it('키보드 올라오면 높이 반환', () => {
    const { result } = renderHook(() => useKeyboardHeight());

    act(() => {
      emitKeyboard(SHOW_EVENT, { endCoordinates: { height: 336 } });
    });

    expect(result.current).toBe(336);
  });

  it('키보드 내려가면 0 반환', () => {
    const { result } = renderHook(() => useKeyboardHeight());

    act(() => {
      emitKeyboard(SHOW_EVENT, { endCoordinates: { height: 336 } });
    });
    act(() => {
      emitKeyboard(HIDE_EVENT);
    });

    expect(result.current).toBe(0);
  });

  it('키보드 높이 변경 시 최신값 반영', () => {
    const { result } = renderHook(() => useKeyboardHeight());

    act(() => {
      emitKeyboard(SHOW_EVENT, { endCoordinates: { height: 280 } });
    });
    expect(result.current).toBe(280);

    act(() => {
      emitKeyboard(SHOW_EVENT, { endCoordinates: { height: 346 } });
    });
    expect(result.current).toBe(346);
  });

  it('unmount 후 리스너 정리 확인 (remove 호출)', () => {
    const { unmount } = renderHook(() => useKeyboardHeight());
    // addListener가 반환한 remove spy 확인
    const showListeners = listeners.get(SHOW_EVENT);
    unmount();
    // unmount 후 listeners에서 콜백 제거됨
    expect(listeners.get(SHOW_EVENT)?.length ?? 0).toBe(0);
  });

  it('여러 인스턴스 독립적으로 동작', () => {
    const { result: r1 } = renderHook(() => useKeyboardHeight());
    const { result: r2 } = renderHook(() => useKeyboardHeight());

    act(() => {
      emitKeyboard(SHOW_EVENT, { endCoordinates: { height: 300 } });
    });

    expect(r1.current).toBe(300);
    expect(r2.current).toBe(300);
  });
});
