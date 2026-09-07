/**
 * 계정 캐시만 지우고 기기 설정은 남기는지 확인한다.
 *
 * 실제 증상(계정 A → 로그아웃 → 계정 B → 오프라인 폴백에서 A의 루틴이 보임)은
 * 계정 두 개와 네트워크 차단이 필요해 시뮬레이터에서 재현이 번거롭다.
 * 문제의 뿌리는 "로그아웃이 어떤 키를 지우느냐" 하나이므로 그 지점을 고정한다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearAccountCache,
  ACCOUNT_CACHE_KEYS,
  ACCOUNT_CACHE_KEY_PREFIXES,
} from '../../lib/accountCache';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
      getItem: jest.fn(async (k: string) => store[k] ?? null),
      removeItem: jest.fn(async (k: string) => { delete store[k]; }),
      getAllKeys: jest.fn(async () => Object.keys(store)),
      multiRemove: jest.fn(async (ks: string[]) => { ks.forEach((k) => delete store[k]); }),
      __reset: (s: Record<string, string>) => { store = { ...s }; },
      __all: () => ({ ...store }),
    },
  };
});

const AS = AsyncStorage as any;

const DEVICE_SETTINGS = {
  'setting:weightUnit': 'kg',
  'setting:showBodypartSelector': 'true',
  'setting:notifyBeforeRestEnd': 'false',
  'fitlog-theme': 'dark',
};

const ACCOUNT_DATA = {
  user: '{"id":"A"}',
  'routines:v2': '[{"name":"가슴 루틴"}]',
  'restDays:v1': '["2026-09-01"]',
  workout_draft: '{"exercises":[]}',
  'workoutSettingKeys:v1': '["그립"]',
  'restTimer2:벤치프레스': '90',
  'restTimer2:내가만든종목': '120',
  'restTimer2:_default_': '60',
};

describe('clearAccountCache', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // 호출 횟수만 리셋 — jest.fn(impl) 의 구현은 유지된다
    AS.__reset({ ...DEVICE_SETTINGS, ...ACCOUNT_DATA });
  });

  it('계정 데이터를 전부 지운다 — 접두어 키 포함', async () => {
    await clearAccountCache();
    expect(Object.keys(AS.__all()).sort()).toEqual(Object.keys(DEVICE_SETTINGS).sort());
  });

  it('기기 설정은 남긴다 — 로그아웃했다고 테마가 풀리면 안 된다', async () => {
    await clearAccountCache();
    const left = AS.__all();
    expect(left['fitlog-theme']).toBe('dark');
    expect(left['setting:weightUnit']).toBe('kg');
  });

  it('고정 키와 접두어 매칭을 한 번의 multiRemove 로 지운다', async () => {
    await clearAccountCache();
    expect(AS.multiRemove).toHaveBeenCalledTimes(1);
    const removed: string[] = AS.multiRemove.mock.calls[0][0];
    expect(removed).toEqual(expect.arrayContaining([...ACCOUNT_CACHE_KEYS]));
    expect(removed).toEqual(expect.arrayContaining(['restTimer2:내가만든종목']));
    expect(new Set(removed).size).toBe(removed.length); // 중복 없음
  });

  it('getAllKeys 가 실패해도 고정 키는 지운다', async () => {
    AS.getAllKeys.mockRejectedValueOnce(new Error('boom'));
    await clearAccountCache();
    const left = AS.__all();
    for (const k of ACCOUNT_CACHE_KEYS) expect(left[k]).toBeUndefined();
    expect(left['fitlog-theme']).toBe('dark'); // 기기 설정은 그대로
  });

  it('AsyncStorage 가 통째로 실패해도 던지지 않는다 — 로그아웃을 막으면 안 된다', async () => {
    AS.multiRemove.mockRejectedValueOnce(new Error('boom'));
    await expect(clearAccountCache()).resolves.toBeUndefined();
  });

  it('접두어 목록에 restTimer2: 가 등록돼 있다', () => {
    expect(ACCOUNT_CACHE_KEY_PREFIXES).toContain('restTimer2:');
  });
});
