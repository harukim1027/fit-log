import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: false,
      allowCriticalAlerts: true,
    },
  });
  return status === 'granted';
}

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

// 타이머 시작 시 딱 한 번 예약. 기존 예약 취소 후 등록.
export async function scheduleRestEndNotification(
  seconds: number,
  exerciseName?: string,
) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (seconds <= 0) return;

  // 30초 경고 (남은 시간이 31초 이상일 때)
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

  // 종료 알림
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

export async function cancelRestEndNotification() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
