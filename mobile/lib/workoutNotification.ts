/**
 * @file lib/workoutNotification.ts
 * @description 휴식 타이머 알림 스케줄링
 *
 * 설계 원칙:
 * - 알림은 "예약(schedule)" 방식만 사용 — 즉시 발송(trigger: null)은 포그라운드에서
 *   중복 발생하는 문제가 있어 제거했다.
 * - 타이머 시작 시 기존 예약을 전부 취소하고 새로 등록 — 취소 없이 재등록하면 알림이
 *   누적되어 여러 번 울리는 버그가 발생했다.
 * - 운동 중 진행 알림은 제거 — 매 초 상태 변경 때마다 발송되어 스팸이 됐다.
 */

import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

/** 알림 권한 요청 — 앱 최초 실행 시 호출 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: false,
      // 헬스케어 앱 특성상 운동 중 방해금지 모드에서도 울려야 해서 CriticalAlerts 요청
      allowCriticalAlerts: true,
    },
  });
  return status === 'granted';
}

/** Android 알림 채널 생성 — iOS는 채널 개념 없음 */
export async function setupNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('rest-end', {
    name: '휴식 종료',
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: false,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    bypassDnd: false,
  });
}

/**
 * 휴식 타이머 종료 알림을 예약한다.
 *
 * 30초 경고 알림을 선택적으로 추가하는 이유:
 * - 사용자가 폰을 보지 않을 때 "곧 종료된다"는 예고로 준비 시간을 준다.
 * - 남은 시간이 31초 미만이면 경고 알림이 종료 알림보다 늦게 발생하므로 생략.
 *
 * @param seconds - 남은 휴식 시간(초)
 * @param exerciseName - 표시할 종목명 (선택)
 */
export async function scheduleRestEndNotification(
  seconds: number,
  exerciseName?: string,
) {
  // 새 타이머 시작 시 이전 예약 전부 취소 — 중복 알림 방지
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (seconds <= 0) return;

  if (seconds > 31) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'rest-warning-30',
      content: {
        title: '휴식 타이머',
        body: exerciseName ? `30초 남았어요 · ${exerciseName}` : '30초 남았어요',
        sound: 'default',
        data: { type: 'rest-warning' },
        ...(Platform.OS === 'android' && { channelId: 'rest-end' }),
      },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: seconds - 30,
        repeats: false,
      },
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: 'rest-end',
    content: {
      title: '휴식 종료',
      body: exerciseName ? `${exerciseName} 다음 세트 시작할게요!` : '휴식이 끝났어요!',
      sound: 'default',
      data: { type: 'rest-end' },
      ...(Platform.OS === 'android' && {
        channelId: 'rest-end',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
      }),
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    },
  });
}

/**
 * 휴식 타이머를 리셋하거나 앱 종료 시 예약된 알림을 전부 취소한다.
 * identifier 단위로 취소하지 않고 전체 취소하는 이유:
 * - 경고 + 종료 두 개를 동시에 관리하므로 개별 취소보다 전체 취소가 안전하다.
 */
export async function cancelRestEndNotification() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
