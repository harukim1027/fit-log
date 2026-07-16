/**
 * @file components/RestTimer.tsx
 * @description 세트 간 휴식 타이머 컴포넌트
 *
 * 핵심 설계 포인트:
 *
 * 1. "기준점 타이머" 패턴:
 *    setInterval은 백그라운드에서 throttle(iOS) 또는 freeze(Android)되어
 *    실제보다 느리게 실행된다. startTsRef에 시작 timestamp를 저장하고
 *    매 tick마다 Date.now() - startTs로 경과 시간을 계산해 정확도를 보장한다.
 *
 * 2. stale closure 방지:
 *    intervalRef.current 콜백 안에서 seconds/remaining/onStateChange를
 *    직접 읽으면 클로저 문제로 초기값에 갇힌다. Ref를 미러링하는 패턴으로 해결:
 *    remainingRef, secondsRef, onStateChangeRef → 항상 최신 값을 참조.
 *
 * 3. external/internal 이중 제어 패턴:
 *    pinned 타이머(부모가 상태 소유)와 일반 타이머(내부 state) 모두 지원.
 *    external* props가 있으면 우선하고, 없으면 내부 상태를 사용한다.
 *    onStateChange로 부모에게 상태 변화를 통지한다.
 *
 * 4. AppState 복귀 보정:
 *    foreground 전환 이벤트에서 startTs 기준으로 실제 경과 시간을 재계산한다.
 *    덕분에 앱을 백그라운드로 보냈다가 돌아와도 타이머가 정확히 남은 시간을 표시한다.
 */

import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  AppState,
  Vibration,
  Animated,
  TextInput,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { cancelRestEndNotification } from "../lib/workoutNotification";
import { Icon } from "./AppIcons";
import { useColors } from "../constants/colors";

const PRESETS = [
  { label: "+1분", seconds: 60 },
  { label: "+30초", seconds: 30 },
  { label: "+10초", seconds: 10 },
  { label: "+5초", seconds: 5 },
];

// 종목별로 마지막 사용 시간을 저장해 다음에 같은 종목을 할 때 자동 세팅
const STORAGE_KEY = (name?: string) => `restTimer2:${name ?? "_default_"}`;

const formatTime = (s: number) =>
  Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

interface Props {
  exerciseName?: string;
  pinned?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
  externalSeconds?: number;
  externalRemaining?: number;
  externalRunning?: boolean;
  externalPaused?: boolean;
  onStateChange?: (state: {
    seconds: number;
    remaining: number;
    running: boolean;
    paused: boolean;
  }) => void;
  onLayout?: (e: import('react-native').LayoutChangeEvent) => void;
}

/**
 * Renders a rest countdown timer with time editing, presets, pause controls, and progress feedback.
 *
 * The timer can manage its own state or display state supplied through the external control props.
 * Configured durations are persisted per exercise name.
 *
 * @param exerciseName - Name used to namespace the persisted timer duration
 * @param pinned - Whether the timer uses pinned presentation
 * @param onPin - Called when the timer is pinned
 * @param onUnpin - Called when the timer is unpinned
 * @param externalSeconds - Externally controlled total duration
 * @param externalRemaining - Externally controlled remaining duration
 * @param externalRunning - Externally controlled running state
 * @param externalPaused - Externally controlled paused state
 * @param onStateChange - Called when the timer's internal state changes
 * @param onLayout - Called when the root view layout changes
 */
export default function RestTimer({
  exerciseName,
  pinned,
  onPin,
  onUnpin,
  externalSeconds,
  externalRemaining,
  externalRunning,
  externalPaused,
  onStateChange,
  onLayout,
}: Props) {
  const c = useColors();
  const SHADOW = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  };

  // external* props가 undefined면 내부 state를 사용 (일반 모드)
  // external* props가 있으면 부모가 상태를 소유 (pinned 모드)
  const [_seconds, _setSeconds] = useState(externalSeconds ?? 0);
  const [_remaining, _setRemaining] = useState(externalRemaining ?? 0);
  const [_running, _setRunning] = useState(externalRunning ?? false);
  const [_paused, _setPaused] = useState(externalPaused ?? false);
  const [completed, setCompleted] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [timeInput, setTimeInput] = useState("");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timeInputRef = useRef<TextInput>(null);

  const seconds = externalSeconds !== undefined ? externalSeconds : _seconds;
  const remaining = externalRemaining !== undefined ? externalRemaining : _remaining;
  const running = externalRunning !== undefined ? externalRunning : _running;
  const paused = externalPaused !== undefined ? externalPaused : _paused;

  // 상태 변경 시 부모에도 통지하는 setter 래퍼
  const setSetSeconds = (v: number) => {
    _setSeconds(v);
    onStateChange?.({ seconds: v, remaining, running, paused });
  };
  const setRemaining = (v: number | ((prev: number) => number)) => {
    const next = typeof v === "function" ? v(_remaining) : v;
    _setRemaining(next);
    onStateChange?.({ seconds, remaining: next, running, paused });
  };
  const setRunning = (v: boolean) => {
    _setRunning(v);
    onStateChange?.({ seconds, remaining, running: v, paused });
  };
  const setPaused = (v: boolean) => {
    _setPaused(v);
    onStateChange?.({ seconds, remaining, running, paused: v });
  };

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 기준점 타이머: 이 timestamp를 기준으로 경과 시간을 계산
  const startTsRef = useRef<number | null>(null);
  // stale closure 방지용 Ref 미러링 — interval/AppState 콜백에서 최신값 읽기 위해
  const remainingRef = useRef(remaining);
  const secondsRef = useRef(seconds);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => { remainingRef.current = remaining; }, [remaining]);
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  // onStateChange는 매 렌더마다 새 함수가 오므로 Ref로만 추적 (의존성 배열 제외)
  useEffect(() => { onStateChangeRef.current = onStateChange; });

  // 실행 중일 때 시간 숫자에 맥박 애니메이션 적용 — 타이머가 동작 중임을 시각적으로 표시
  useEffect(() => {
    if (running && !paused) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => { anim.stop(); pulseAnim.setValue(1); };
    } else {
      pulseAnim.setValue(1);
    }
  }, [running, paused]);

  // 종목이 바뀌면 해당 종목의 저장된 시간을 불러옴
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY(exerciseName)).then((val) => {
      if (val) {
        const n = parseInt(val);
        if (!isNaN(n) && n > 0) setSetSeconds(n);
      }
    });
  }, [exerciseName]);

  /**
   * 타이머 완료 처리:
   * - intervalRef 직접 참조해 정리 (stale closure 안전)
   * - Haptics 실패 시 Vibration으로 폴백 (구형 기기 대응)
   */
  const handleTimerComplete = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    startTsRef.current = null;
    remainingRef.current = 0;
    _setRemaining(0);
    _setRunning(false);
    _setPaused(false);
    setCompleted(true);
    onStateChangeRef.current?.({ seconds: secondsRef.current, remaining: 0, running: false, paused: false });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
      Vibration.vibrate([0, 300, 200, 300]);
    });
  };

  /**
   * 타이머 카운트다운 인터벌:
   * running/paused가 바뀔 때마다 재설정.
   * 500ms 주기로 tick해 1초 단위 표시를 충분한 반응성으로 업데이트.
   * Date.now() - startTs 기반이므로 interval 지연에 영향받지 않는다.
   */
  useEffect(() => {
    if (running && !paused) {
      // 기준점 계산: 이미 경과된 시간을 반영해 일시정지 후 재개도 자연스럽게
      startTsRef.current = Date.now() - (secondsRef.current - remainingRef.current) * 1000;
      intervalRef.current = setInterval(() => {
        if (!startTsRef.current) return;
        const elapsed = Math.floor((Date.now() - startTsRef.current) / 1000);
        const next = Math.max(0, secondsRef.current - elapsed);
        if (next !== remainingRef.current) {
          remainingRef.current = next;
          _setRemaining(next);
          if (next === 0) {
            handleTimerComplete();
          } else {
            onStateChangeRef.current?.({ seconds: secondsRef.current, remaining: next, running: true, paused: false });
          }
        }
      }, 500);
    }
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [running, paused]);

  /**
   * 백그라운드에서 포그라운드로 복귀 시 시간 보정.
   * iOS는 백그라운드에서 setInterval을 완전히 멈출 수 있어
   * 앱 복귀 시 이미 타이머가 만료됐어도 화면에 안 보일 수 있다.
   * startTsRef 기준으로 재계산해 실제 시간을 반영한다.
   */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && startTsRef.current !== null) {
        const elapsed = Math.floor((Date.now() - startTsRef.current) / 1000);
        const next = Math.max(0, secondsRef.current - elapsed);
        if (next !== remainingRef.current) {
          remainingRef.current = next;
          _setRemaining(next);
          if (next === 0) {
            handleTimerComplete();
          } else {
            onStateChangeRef.current?.({ seconds: secondsRef.current, remaining: next, running: true, paused: false });
          }
        }
      }
    });
    return () => sub.remove();
  }, []);

  // 컴포넌트 언마운트 시 interval 정리 (메모리 누수 방지)
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const applySeconds = async (n: number) => {
    // 0~3600초로 클램핑 — 음수 또는 1시간 초과 방지
    const clamped = Math.max(0, Math.min(3600, n));
    setSetSeconds(clamped);
    await AsyncStorage.setItem(STORAGE_KEY(exerciseName), String(clamped));
  };

  const addPreset = (p: number) => applySeconds(seconds + p);

  /** 타이머 + 설정 시간 모두 초기화 */
  const reset = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    startTsRef.current = null;
    remainingRef.current = 0;
    _setRunning(false);
    _setPaused(false);
    _setRemaining(0);
    _setSeconds(0);
    setCompleted(false);
    setIsEditingTime(false);
    AsyncStorage.removeItem(STORAGE_KEY(exerciseName));
    cancelRestEndNotification().catch(() => {});
    onStateChange?.({ seconds: 0, remaining: 0, running: false, paused: false });
  };

  /** 타이머만 중단 (설정 시간 유지) */
  const stopTimer = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    startTsRef.current = null;
    _setRunning(false);
    _setPaused(false);
    _setRemaining(0);
    setCompleted(false);
    onStateChangeRef.current?.({ seconds: secondsRef.current, remaining: 0, running: false, paused: false });
  };

  /**
   * 완료 후 같은 시간으로 다시 시작.
   * setTimeout(0)으로 state flush를 보장한 뒤 running: true로 전환.
   * 동일 렌더 사이클에서 running: false → true 전환 시 useEffect가 트리거되지 않을 수 있어 필요.
   */
  const restartTimer = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    startTsRef.current = null;
    _setRunning(false);
    _setPaused(false);
    _setRemaining(seconds);
    setCompleted(false);
    setTimeout(() => {
      _setRunning(true);
      onStateChange?.({ seconds, remaining: seconds, running: true, paused: false });
    }, 0);
  };

  const start = () => {
    _setRemaining(seconds);
    _setRunning(true);
    _setPaused(false);
    setCompleted(false);
    onStateChange?.({ seconds, remaining: seconds, running: true, paused: false });
  };

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      // 일시정지 시 startTs 초기화 — 재개할 때 이미 경과된 시간을 반영해 기준점 재계산
      startTsRef.current = null;
      setPaused(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  };

  const commitTimeEdit = () => {
    const secs = parseInt(timeInput);
    if (!isNaN(secs) && secs > 0) applySeconds(secs);
    setIsEditingTime(false);
  };

  // 0~100% 진행률 — 진행바 너비에 사용
  const progress = remaining > 0 && seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 0;

  const timerState =
    paused ? 'paused' as const :
    running ? 'running' as const :
    completed ? 'completed' as const :
    'waiting' as const;

  // 10초 이하이면 danger 색상으로 긴박감 표시
  const timerColor =
    (timerState === 'running' || timerState === 'paused') && remaining <= 10 ? c.danger :
    timerState === 'running' ? c.warning :
    timerState === 'paused' ? c.warning :
    timerState === 'completed' ? c.primary :
    seconds > 0 ? c.textPrimary : c.textMuted;

  const actionLabel =
    timerState === 'running' ? '일시정지' :
    timerState === 'paused' ? '재개' :
    timerState === 'completed' ? '다시시작' :
    seconds === 0 ? '시간 설정' : '시작';

  const actionHandler =
    timerState === 'running' ? togglePause :
    timerState === 'paused' ? togglePause :
    timerState === 'completed' ? restartTimer :
    seconds === 0 ? undefined : start;

  const actionDisabled = timerState === 'waiting' && seconds === 0;

  const displayTime =
    timerState === 'running' || timerState === 'paused'
      ? formatTime(remaining)
      : timerState === 'completed'
      ? '완료!'
      : seconds > 0 ? formatTime(seconds) : '--:--';

  // 실행/일시정지 시 하단 진행바 표시 (컨테이너 paddingBottom 확보)
  const showProgress = timerState === 'running' || timerState === 'paused';

  return (
    <View
      onLayout={onLayout}
      style={[
        {
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: pinned ? 0 : 18,
          borderBottomLeftRadius: 18,
          borderBottomRightRadius: 18,
          paddingVertical: 10,
          paddingHorizontal: 12,
          paddingBottom: showProgress ? 13 : 10,
          marginBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          position: "relative",
        },
        SHADOW,
      ]}>

      {/* [좌] 미니 블록: 휴식 라벨 / 고정·리셋 */}
      <View style={{ flexShrink: 0, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Icon name="clock" size={15} color={c.textSecondary} />
          <Text style={{ fontSize: 12, fontWeight: "800", color: c.textPrimary }}>휴식</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {(onPin || onUnpin) && (
            <Switch
              value={!!pinned}
              onValueChange={(v) => v ? onPin?.() : onUnpin?.()}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor={c.surface}
              style={{ transform: [{ scaleX: 0.6 }, { scaleY: 0.6 }] }}
            />
          )}
          <TouchableOpacity activeOpacity={0.8} onPress={reset} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="refresh" size={14} color={c.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* [중앙] 시간 + 액션 버튼 */}
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {/* 시간 표시 / 편집 */}
        {isEditingTime ? (
          <TextInput
            ref={timeInputRef}
            value={timeInput}
            onChangeText={setTimeInput}
            keyboardType="numeric"
            autoFocus
            onBlur={commitTimeEdit}
            onSubmitEditing={commitTimeEdit}
            returnKeyType="done"
            style={{
              fontSize: 24,
              fontWeight: "900",
              letterSpacing: -1,
              color: c.primary,
              minWidth: 66,
              borderBottomWidth: 2,
              borderBottomColor: c.primary,
              paddingVertical: 2,
            }}
          />
        ) : (
          <TouchableOpacity
            onPress={() => {
              setTimeInput(String(seconds));
              setIsEditingTime(true);
            }}
            activeOpacity={0.7}>
            <Animated.Text
              style={{
                fontSize: 24,
                fontWeight: "900",
                letterSpacing: -1,
                color: timerColor,
                minWidth: 66,
                textAlign: "center",
                fontVariant: ['tabular-nums'],
                transform: timerState === 'running' ? [{ scale: pulseAnim }] : [],
              }}>
              {displayTime}
            </Animated.Text>
          </TouchableOpacity>
        )}

        {/* 액션 버튼 */}
        <TouchableOpacity
          style={{
            flex: 1,
            borderRadius: 11,
            paddingVertical: 8,
            paddingHorizontal: 14,
            alignItems: "center",
            backgroundColor:
              actionDisabled ? c.surfaceAlt :
              timerState === 'running' ? c.warning + '22' : c.warning,
          }}
          onPress={actionHandler ?? undefined}
          activeOpacity={actionDisabled ? 1 : 0.8}
          disabled={actionDisabled}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {timerState === 'running' && (
              <Icon name="stop" size={13} color={c.warning} />
            )}
            {(timerState === 'paused' || (timerState === 'waiting' && seconds > 0)) && (
              <View style={{ marginLeft: 2 }}>
                <Icon name="play" size={13} color={c.onAccent} />
              </View>
            )}
            {timerState === 'completed' && (
              <Icon name="refresh" size={13} color={c.onAccent} />
            )}
            <Text style={{
              fontSize: 13,
              fontWeight: "900",
              color:
                actionDisabled ? c.textMuted :
                timerState === 'running' ? c.warning : c.onAccent,
            }}>
              {actionLabel}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* [우] 프리셋 2×2 그리드: +1분 +30초 +10초 +5초 */}
      <View style={{ flexShrink: 0, width: 84, flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
        {PRESETS.map((p) => (
          <TouchableOpacity activeOpacity={0.8}
            key={p.seconds}
            onPress={() => addPreset(p.seconds)}
            style={{
              // flexBasis:"48%"는 48%×2 + gap4 = 84.6px > 컨테이너 84px라 매 버튼이
              // wrap되어 1열 4행으로 렌더됐다. 명시적 폭으로 40+40+gap4=84 정확히 맞춰 2열 보장.
              width: 40,
              borderRadius: 8,
              paddingVertical: 5,
              alignItems: "center",
              backgroundColor: c.warning + '18',
            }}>
            <Text style={{ fontSize: 10.5, fontWeight: "800", color: c.warning }}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 하단 진행바 (실행/일시정지 시) */}
      {showProgress && (
        <View style={{ position: "absolute", left: 12, right: 12, bottom: 4, height: 3, backgroundColor: c.surfaceAlt, borderRadius: 999, overflow: "hidden" }}>
          <View style={{ height: "100%", backgroundColor: timerState === 'paused' ? c.textMuted : c.warning, borderRadius: 999, width: `${progress}%` as `${number}%` }} />
        </View>
      )}
    </View>
  );
}
