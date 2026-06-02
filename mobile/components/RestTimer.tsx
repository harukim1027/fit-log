import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  AppState,
  Vibration,
  Animated,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Icon, PlayIcon } from "./AppIcons";
import { useColors } from "../constants/colors";
import { NumberPad } from "./ui/NumberPad";

const PRESETS = [
  { label: "5초", seconds: 5 },
  { label: "10초", seconds: 10 },
  { label: "30초", seconds: 30 },
  { label: "1분", seconds: 60 },
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
  const [inputText, setInputText] = useState("");
  const [timerPadVisible, setTimerPadVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [completed, setCompleted] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const seconds = externalSeconds !== undefined ? externalSeconds : _seconds;
  const remaining =
    externalRemaining !== undefined ? externalRemaining : _remaining;
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
  const bgTimestampRef = useRef<number | null>(null);
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

  useEffect(() => {
    if (running && !paused) {
      intervalRef.current = setInterval(() => {
        const r = remainingRef.current;
        const next = r <= 1 ? 0 : r - 1;
        remainingRef.current = next;
        _setRemaining(next);
        if (r <= 1) {
          clearInterval(intervalRef.current!);
          _setRunning(false);
          _setPaused(false);
          setCompleted(true);
          onStateChangeRef.current?.({ seconds: secondsRef.current, remaining: 0, running: false, paused: false });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
            Vibration.vibrate([0, 300, 200, 300]);
          });
        } else {
          onStateChangeRef.current?.({ seconds: secondsRef.current, remaining: next, running: true, paused: false });
        }
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, paused]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        bgTimestampRef.current = Date.now();
      } else if (state === "active" && bgTimestampRef.current !== null) {
        if (running && !paused) {
          const elapsed = Math.round(
            (Date.now() - bgTimestampRef.current) / 1000
          );
          setRemaining((r) => Math.max(0, r - elapsed));
        }
        bgTimestampRef.current = null;
      }
    });
    return () => sub.remove();
  }, [running, paused]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const applySeconds = async (n: number) => {
    const clamped = Math.max(0, Math.min(3600, n));
    setSetSeconds(clamped);
    await AsyncStorage.setItem(STORAGE_KEY(exerciseName), String(clamped));
  };

  const addPreset = (p: number) => applySeconds(seconds + p);
  const adjust = (delta: number) => applySeconds(seconds + delta);

  const handleInput = (text: string) => {
    setInputText(text);
    const n = parseInt(text);
    if (!isNaN(n) && n > 0 && n <= 3600) applySeconds(n);
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setPaused(false);
    setRemaining(0);
    setCompleted(false);
    setSetSeconds(0);
    setInputText("");
    AsyncStorage.removeItem(STORAGE_KEY(exerciseName));
  };

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    _setRunning(false);
    _setPaused(false);
    _setRemaining(0);
    setCompleted(false);
    onStateChangeRef.current?.({ seconds: secondsRef.current, remaining: 0, running: false, paused: false });
  };

  const restartTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
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
      setPaused(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  };

  const progress = remaining > 0 && seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 0;

  // paused를 먼저 체크: running=true,paused=true 케이스도 'paused'로 처리
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

  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: pinned ? 0 : 30,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          padding: 18,
          marginBottom: 12,
          marginHorizontal: 0,
        },
        SHADOW,
      ]}>
      {/* ── 헤더 ── */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: collapsed ? 0 : 12,
        }}>
        <TouchableOpacity
          onPress={() => setCollapsed((v) => !v)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            flex: 1,
          }}
          activeOpacity={0.8}>
          <Icon name="clock" size={16} color={c.textSecondary} />
          <Text style={{ fontSize: 15, fontWeight: "800", color: c.textPrimary }}>
            휴식 타이머
          </Text>
          <Text style={{ fontSize: 13, color: c.textMuted, fontWeight: "900" }}>
            {collapsed ? "▼" : "▲"}
          </Text>
        </TouchableOpacity>

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
          <TouchableOpacity
            onPress={reset}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon name="refresh" size={16} color={c.danger} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: c.danger }}>
              리셋
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 접힌 상태 ── */}
      {collapsed && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
          <Animated.Text
            style={{
              fontSize: 26,
              fontWeight: "900",
              letterSpacing: -1,
              minWidth: 64,
              color: timerColor,
              transform: timerState === 'running' ? [{ scale: pulseAnim }] : [],
            }}>
            {timerState === 'running' || timerState === 'paused'
              ? formatTime(remaining)
              : timerState === 'completed'
              ? '완료!'
              : seconds > 0 ? formatTime(seconds) : '설정하기'}
          </Animated.Text>

          <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
            {timerState === 'waiting' && seconds > 0 && (
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: c.warning, borderRadius: 999, paddingVertical: 8, alignItems: 'center' }}
                onPress={start} activeOpacity={0.8}>
                <Text style={{ fontSize: 12, fontWeight: '900', color: c.onAccent }}>▶ 시작</Text>
              </TouchableOpacity>
            )}
            {timerState === 'running' && (
              <>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: c.warning + '18', borderRadius: 999, paddingVertical: 8, alignItems: 'center' }}
                  onPress={togglePause} activeOpacity={0.8}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: c.warning }}>⏸ 일시정지</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 999, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: c.border }}
                  onPress={stopTimer} activeOpacity={0.8}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: c.textSecondary }}>⏹ 초기화</Text>
                </TouchableOpacity>
              </>
            )}
            {timerState === 'paused' && (
              <>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: c.warning, borderRadius: 999, paddingVertical: 8, alignItems: 'center' }}
                  onPress={togglePause} activeOpacity={0.8}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: c.onAccent }}>▶ 재개</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 999, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: c.border }}
                  onPress={stopTimer} activeOpacity={0.8}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: c.textSecondary }}>⏹ 초기화</Text>
                </TouchableOpacity>
              </>
            )}
            {timerState === 'completed' && (
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: c.warning, borderRadius: 999, paddingVertical: 8, alignItems: 'center' }}
                onPress={restartTimer} activeOpacity={0.8}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="refresh" size={12} color={c.onAccent} />
                  <Text style={{ fontSize: 12, fontWeight: '900', color: c.onAccent }}>다시시작</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── 펼친 상태 ── */}
      {!collapsed && (
        <>
          {/* 1. 현재 카운트다운 (상단) */}
          {(timerState === 'running' || timerState === 'paused') && (
            <View style={{ alignItems: "center", gap: 10, marginBottom: 12 }}>
              <View style={{ width: "100%", height: 8, backgroundColor: c.surfaceAlt, borderRadius: 999, overflow: "hidden" }}>
                <View style={{ height: "100%", backgroundColor: timerState === 'paused' ? c.textMuted : c.warning, borderRadius: 999, width: `${progress}%` as `${number}%` }} />
              </View>
              <Animated.Text style={{ fontSize: 48, fontWeight: "900", letterSpacing: -2, color: timerColor, transform: timerState === 'running' ? [{ scale: pulseAnim }] : [] }}>
                {formatTime(remaining)}
              </Animated.Text>
              <TouchableOpacity
                style={{ backgroundColor: c.surfaceAlt, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 22, borderWidth: 1, borderColor: c.border }}
                onPress={stopTimer} activeOpacity={0.8}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: c.textSecondary }}>⏹ 초기화</Text>
              </TouchableOpacity>
            </View>
          )}

          {timerState === 'completed' && (
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 48, fontWeight: '900', letterSpacing: -2, color: c.primary }}>완료!</Text>
            </View>
          )}

          {/* 2. 직접입력 + 시작/일시정지 버튼 */}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <TouchableOpacity
              onPress={() => setTimerPadVisible(true)}
              style={{
                flex: 1,
                backgroundColor: c.surfaceAlt,
                borderRadius: 16,
                paddingVertical: 12,
                paddingHorizontal: 14,
                alignItems: 'center',
              }}>
              <Text style={{
                fontSize: 15,
                fontWeight: "800",
                color: inputText ? c.textPrimary : c.textMuted,
                textAlign: "center",
              }}>
                {inputText || '직접 입력 (초)'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                borderRadius: 16,
                paddingVertical: 12,
                paddingHorizontal: 16,
                minWidth: 90,
                alignItems: 'center',
                backgroundColor:
                  timerState === 'running' ? c.warning + '18' :
                  timerState === 'waiting' && seconds === 0 ? c.surfaceAlt : c.warning,
              }}
              onPress={
                timerState === 'running' ? togglePause :
                timerState === 'paused' ? togglePause :
                timerState === 'completed' ? restartTimer :
                seconds === 0 ? undefined : start
              }
              activeOpacity={timerState === 'waiting' && seconds === 0 ? 1 : 0.8}
              disabled={timerState === 'waiting' && seconds === 0}>
              <Text style={{
                fontSize: 13,
                fontWeight: '900',
                color:
                  timerState === 'running' ? c.warning :
                  timerState === 'waiting' && seconds === 0 ? c.textMuted : c.surface,
              }}>
                {timerState === 'running' ? '⏸ 일시정지' :
                 timerState === 'paused' ? '▶ 재개' :
                 timerState === 'completed' ? '다시' :
                 seconds === 0 ? '시간 설정' : '▶ 시작'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── 구분선 ── */}
          <View style={{ height: 1, backgroundColor: c.border, marginBottom: 14 }} />

          {/* 3. 설정시간 (하단) */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              marginBottom: 14,
            }}>
            <TouchableOpacity
              onPress={() => adjust(-5)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: c.danger + '20',
                alignItems: "center",
                justifyContent: "center",
              }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: c.danger, marginTop: -2 }}>−</Text>
            </TouchableOpacity>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 34, fontWeight: "900", color: c.textPrimary, letterSpacing: -1 }}>
                {formatTime(seconds)}
              </Text>
              <Text style={{ fontSize: 10, color: c.textMuted, fontWeight: "600", marginTop: 2 }}>설정 시간</Text>
            </View>
            <TouchableOpacity
              onPress={() => adjust(5)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: c.primary,
                alignItems: "center",
                justifyContent: "center",
              }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: c.onAccent, marginTop: -2 }}>+</Text>
            </TouchableOpacity>
          </View>

          {/* 4. Preset 버튼 */}
          <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap" }}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.seconds}
                onPress={() => addPreset(p.seconds)}
                style={{
                  flex: 1,
                  minWidth: 50,
                  borderRadius: 999,
                  paddingVertical: 7,
                  alignItems: "center",
                  backgroundColor: c.warning + '18',
                }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: c.warning }}>+{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <NumberPad
        visible={timerPadVisible}
        value={inputText}
        decimal={false}
        suffix="초"
        max={3600}
        onConfirm={(v) => { handleInput(v); setTimerPadVisible(false); }}
        onCancel={() => setTimerPadVisible(false)}
      />
    </View>
  );
}
