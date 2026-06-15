/**
 * @file lib/liveActivity.ts
 * @description iOS Live Activity(휴식 타이머) 래퍼.
 *
 * 네이티브 모듈(react-native-widget-extension)은 dev client 빌드(iOS 16.2+)에만 존재한다.
 * Android / Expo Go / 네이티브 미빌드 상태에서는 모든 함수가 안전하게 no-op이 되도록
 * Platform 가드 + require try/catch + 호출부 try/catch로 감쌌다.
 *
 * 데이터 계약은 widgets/Module.swift, widgets/Attributes.swift와 일치해야 한다:
 *   startActivity(exerciseName, endDateMs, isPaused, pausedRemaining)
 *   updateActivity(endDateMs, isPaused, pausedRemaining)
 *   endActivity()
 *   areActivitiesEnabled(): boolean
 */
import { Platform } from "react-native";

type WidgetExtension = typeof import("react-native-widget-extension");

let native: WidgetExtension | null = null;
if (Platform.OS === "ios") {
  try {
    // 정적 import를 피해 Android/미빌드 환경에서 모듈 로드 시 throw하지 않게 한다.
    native = require("react-native-widget-extension");
  } catch {
    native = null;
  }
}

/** Live Activity 사용 가능(iOS 16.2+ & 사용자 허용 & 네이티브 빌드됨) 여부 */
export function liveActivityAvailable(): boolean {
  try {
    return !!native && native.areActivitiesEnabled() === true;
  } catch {
    return false;
  }
}

/** 휴식 시작 — 새 Live Activity 요청 */
export function startRestLiveActivity(
  exerciseName: string,
  endDateMs: number,
  isPaused: boolean,
  remaining: number
) {
  if (!liveActivityAvailable()) return;
  try {
    native!.startActivity(
      exerciseName,
      endDateMs,
      isPaused,
      Math.max(0, Math.round(remaining))
    );
  } catch {}
}

/** 휴식 갱신 — 일시정지/재개/시간연장 */
export function updateRestLiveActivity(
  endDateMs: number,
  isPaused: boolean,
  remaining: number
) {
  if (!native) return;
  try {
    native.updateActivity(endDateMs, isPaused, Math.max(0, Math.round(remaining)));
  } catch {}
}

/** 휴식 종료/취소 — 모든 Live Activity 제거 */
export function endRestLiveActivity() {
  if (!native) return;
  try {
    native.endActivity();
  } catch {}
}
