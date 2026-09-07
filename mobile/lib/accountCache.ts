/**
 * @file lib/accountCache.ts
 * @description 계정에 딸린 로컬 캐시를 한 곳에서 지운다.
 *
 * ── 왜 필요한가 ────────────────────────────────────────────────────────────
 * 캐시 키가 계정별로 나뉘어 있지 않다. 로그아웃이 토큰과 `user`만 지우던 동안
 * `routines:v2` 같은 키는 그대로 남았고, 다른 계정으로 로그인한 뒤 **서버 요청이
 * 실패하면 오프라인 폴백이 이전 사용자의 루틴을 읽어 왔다.** 온라인에서는 새로
 * 받아 덮어써서 드러나지 않는, 오프라인에서만 보이는 문제였다.
 *
 * ── 기기 설정은 지우지 않는다 ──────────────────────────────────────────────
 * 판단 기준은 **"다른 계정이 보면 안 되는 것인가"** 다.
 *   계정 데이터 — 루틴, 휴식일, 작성 중이던 운동, 종목별 설정
 *   기기 설정   — 테마, 무게 단위, 부위 선택기, 휴식 알림
 * 로그아웃했다고 다크모드가 풀리면 어색하다. 기기 설정은 사람이 아니라 이 기기에
 * 속한다.
 *
 * ── 새 캐시를 추가할 때 ────────────────────────────────────────────────────
 * 계정에 딸린 값을 AsyncStorage에 저장하게 되면 **아래 목록에 반드시 등록한다.**
 * 등록하지 않으면 로그아웃해도 남고, 그 사실은 오프라인 상태에서만 드러나서
 * 발견이 늦다. 고정 키는 ACCOUNT_CACHE_KEYS, 접두어가 붙는 키는
 * ACCOUNT_CACHE_KEY_PREFIXES에 넣는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/** 계정에 딸린 고정 키. 새 캐시가 생기면 여기 등록할 것. */
export const ACCOUNT_CACHE_KEYS = [
  'user', // store/authStore.ts — 서버 프로필 캐시
  'routines:v2', // store/routineStore.ts
  'restDays:v1', // store/restDayStore.ts
  'workout_draft', // store/workoutStore.ts — 작성 중이던 운동 세션
  'workoutSettingKeys:v1', // components/workout/ExerciseAdder.tsx — 기구 설정 키
] as const;

/**
 * 계정에 딸린 접두어 키. 이름이 실행 중에 정해져 고정 목록으로 못 적는다.
 *
 * `restTimer2:{운동명}` — 종목별 휴식 시간. 값은 초 단위 숫자지만 **키에 커스텀
 * 종목명이 들어간다.** 다른 계정이 같은 이름 종목을 만들면 이전 사용자가 정한
 * 값이 프리필되어, "그 종목을 만들었고 그 시간을 썼다"는 사실이 샌다. 게다가
 * 종목마다 무한히 쌓이는데 지금까지 지워지는 시점이 없었다.
 */
export const ACCOUNT_CACHE_KEY_PREFIXES = ['restTimer2:'] as const;

/**
 * 계정 캐시를 전부 지운다. 로그아웃과 탈퇴가 같은 경로를 쓴다.
 *
 * 고정 키와 접두어 매칭 결과를 **합쳐서 한 번에** 지운다. 두 경로로 나누면
 * 하나가 빠져도 티가 안 난다.
 *
 * 실패해도 던지지 않는다. 여기서 던지면 로그아웃 자체가 막혀 사용자가 계정을
 * 빠져나올 수 없게 된다. 캐시가 남는 것보다 그쪽이 나쁘다.
 */
export async function clearAccountCache(): Promise<void> {
  try {
    let keys: string[] = [...ACCOUNT_CACHE_KEYS];
    try {
      const all = await AsyncStorage.getAllKeys();
      keys = keys.concat(
        all.filter((k) => ACCOUNT_CACHE_KEY_PREFIXES.some((p) => k.startsWith(p))),
      );
    } catch {
      // getAllKeys가 실패해도 고정 키는 지운다.
    }
    await AsyncStorage.multiRemove(Array.from(new Set(keys)));
  } catch {
    // 지우지 못해도 로그아웃은 계속 진행한다.
  }
}
