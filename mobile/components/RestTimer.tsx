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
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 4,
  };

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
  const startTsRef = useRef<number | null>(null);
  const remainingRef = useRef(remaining);
  const secondsRef = useRef(seconds);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => { remainingRef.current = remaining; }, [remaining]);
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  useEffect(() => { onStateChangeRef.current = onStateChange; });

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

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY(exerciseName)).then((val) => {
      if (val) {
        const n = parseInt(val);
        if (!isNaN(n) && n > 0) setSetSeconds(n);
      }
    });
  }, [exerciseName]);

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

  useEffect(() => {
    if (running && !paused) {
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

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const applySeconds = async (n: number) => {
    const clamped = Math.max(0, Math.min(3600, n));
    setSetSeconds(clamped);
    await AsyncStorage.setItem(STORAGE_KEY(exerciseName), String(clamped));
  };

  const addPreset = (p: number) => applySeconds(seconds + p);

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

  const stopTimer = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    startTsRef.current = null;
    _setRunning(false);
    _setPaused(false);
    _setRemaining(0);
    setCompleted(false);
    onStateChangeRef.current?.({ seconds: secondsRef.current, remaining: 0, running: false, paused: false });
  };

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

  const progress = remaining > 0 && seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 0;

  const timerState =
    paused ? 'paused' as const :
    running ? 'running' as const :
    completed ? 'completed' as const :
    'waiting' as const;

  const timerColor =
    (timerState === 'running' || timerState === 'paused') && remaining <= 10 ? c.danger :
    timerState === 'running' ? c.warning :
    timerState === 'paused' ? c.warning :
    timerState === 'completed' ? c.primary :
    seconds > 0 ? c.textPrimary : c.textMuted;

  const actionLabel =
    timerState === 'running' ? '⏸ 일시정지' :
    timerState === 'paused' ? '▶ 재개' :
    timerState === 'completed' ? '↺ 다시시작' :
    seconds === 0 ? '시간 설정' : '▶ 시작';

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

  return (
    <View
      onLayout={onLayout}
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: pinned ? 0 : 30,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          padding: 18,
          marginBottom: 12,
        },
        SHADOW,
      ]}>

      {/* ── 헤더 ── */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="clock" size={16} color={c.textSecondary} />
          <Text style={{ fontSize: 15, fontWeight: "800", color: c.textPrimary }}>휴식 타이머</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {(onPin || onUnpin) && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: pinned ? c.warning : c.textSecondary }}>고정</Text>
              <Switch
                value={!!pinned}
                onValueChange={(v) => v ? onPin?.() : onUnpin?.()}
                trackColor={{ false: c.border, true: c.primary }}
                thumbColor={c.surface}
                style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
              />
            </View>
          )}
          <TouchableOpacity onPress={reset} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon name="refresh" size={16} color={c.danger} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: c.danger }}>리셋</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 진행바 (실행 중일 때) ── */}
      {(timerState === 'running' || timerState === 'paused') && (
        <View style={{ width: "100%", height: 4, backgroundColor: c.surfaceAlt, borderRadius: 999, overflow: "hidden", marginBottom: 12 }}>
          <View style={{ height: "100%", backgroundColor: timerState === 'paused' ? c.textMuted : c.warning, borderRadius: 999, width: `${progress}%` as `${number}%` }} />
        </View>
      )}

      {/* ── 메인 영역: 시간 + 액션 버튼 ── */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
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
              fontSize: 38,
              fontWeight: "900",
              letterSpacing: -1,
              color: c.primary,
              minWidth: 100,
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
                fontSize: 38,
                fontWeight: "900",
                letterSpacing: -1,
                color: timerColor,
                minWidth: 100,
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
            borderRadius: 16,
            paddingVertical: 14,
            alignItems: "center",
            backgroundColor:
              actionDisabled ? c.surfaceAlt :
              timerState === 'running' ? c.warning + '22' : c.warning,
          }}
          onPress={actionHandler ?? undefined}
          activeOpacity={actionDisabled ? 1 : 0.8}
          disabled={actionDisabled}>
          <Text style={{
            fontSize: 15,
            fontWeight: "900",
            color:
              actionDisabled ? c.textMuted :
              timerState === 'running' ? c.warning : c.onAccent,
          }}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── 구분선 ── */}
      <View style={{ height: 1, backgroundColor: c.border, marginBottom: 12 }} />

      {/* ── 빠른 추가 버튼: +1분 +30초 +10초 +5초 ── */}
      <View style={{ flexDirection: "row", gap: 6 }}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p.seconds}
            onPress={() => addPreset(p.seconds)}
            style={{
              flex: 1,
              borderRadius: 999,
              paddingVertical: 8,
              alignItems: "center",
              backgroundColor: c.warning + '18',
            }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: c.warning }}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
