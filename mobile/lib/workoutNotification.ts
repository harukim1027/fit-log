import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

const WORKOUT_NOTIF_ID = 'workout-timer';
const REST_END_NOTIF_ID = 'rest-end';

const formatElapsed = (s: number): string => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const formatRestTime = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}분 ${sec}초` : `${sec}초`;
};

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function setupNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('workout', {
    name: '운동 타이머',
    importance: Notifications.AndroidImportance.LOW,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: false,
    vibrationPattern: [],
    enableVibrate: false,
  });
}

export async function showWorkoutNotification(
  elapsed: number,
  exerciseCount: number,
  totalVolume: number,
) {
  await Notifications.scheduleNotificationAsync({
    identifier: WORKOUT_NOTIF_ID,
    content: {
      title: '운동 중',
      body: `${formatElapsed(elapsed)}  ·  ${exerciseCount}종목  ·  ${Math.round(totalVolume).toLocaleString()}kg`,
      data: { type: 'workout' },
      sticky: true,
      ...(Platform.OS === 'android' && { channelId: 'workout' }),
    },
    trigger: null,
  });
}

export async function showRestNotification(
  remainingSeconds: number,
  exerciseName?: string,
) {
  const body = exerciseName
    ? `${exerciseName}  ·  ${formatRestTime(remainingSeconds)} 남음`
    : `${formatRestTime(remainingSeconds)} 남음`;

  await Notifications.scheduleNotificationAsync({
    identifier: WORKOUT_NOTIF_ID,
    content: {
      title: '휴식 중',
      body,
      data: { type: 'rest' },
      sticky: true,
      ...(Platform.OS === 'android' && { channelId: 'workout' }),
    },
    trigger: null,
  });
}

export async function scheduleRestEndNotification(
  remainingSeconds: number,
  exerciseName?: string,
) {
  await Notifications.cancelScheduledNotificationAsync(REST_END_NOTIF_ID).catch(() => {});
  if (remainingSeconds <= 0) return;
  const body = exerciseName ? `${exerciseName} 휴식 완료` : '휴식 완료';
  await Notifications.scheduleNotificationAsync({
    identifier: REST_END_NOTIF_ID,
    content: {
      title: '휴식 완료',
      body,
      data: { type: 'rest-end' },
      ...(Platform.OS === 'android' && { channelId: 'workout' }),
    },
    trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: remainingSeconds, repeats: false },
  });
}

export async function cancelRestEndNotification() {
  await Notifications.cancelScheduledNotificationAsync(REST_END_NOTIF_ID).catch(() => {});
}

export async function showRestWarningNotification(
  remainingSeconds: number,
  exerciseName?: string,
) {
  const body = exerciseName
    ? `${remainingSeconds}초 남았어요 · ${exerciseName}`
    : `${remainingSeconds}초 남았어요`;
  await Notifications.scheduleNotificationAsync({
    identifier: `rest-warning-${remainingSeconds}`,
    content: {
      title: '휴식 타이머',
      body,
      sound: true,
      ...(Platform.OS === 'android' && { channelId: 'workout' }),
    },
    trigger: null,
  });
}

export async function dismissWorkoutNotification() {
  await Notifications.cancelScheduledNotificationAsync(REST_END_NOTIF_ID).catch(() => {});
  await Notifications.dismissNotificationAsync(WORKOUT_NOTIF_ID).catch(() => {});
}
