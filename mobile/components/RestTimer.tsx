import { View, Text, TouchableOpacity, TextInput, AppState, Vibration } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Icon, PlayIcon } from './AppIcons';

const PRESETS = [
  { label: '30초', seconds: 30 },
  { label: '1분', seconds: 60 },
  { label: '1분30', seconds: 90 },
  { label: '2분', seconds: 120 },
  { label: '3분', seconds: 180 },
  { label: '5분', seconds: 300 },
];

const STORAGE_KEY = (name?: string) => `restTimer2:${name ?? '_default_'}`;

const SHADOW = {
  shadowColor: "#4EBFA0",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.20,
  shadowRadius: 24,
  elevation: 4,
};

const formatTime = (s: number) =>
  Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

interface Props {
  exerciseName?: string;
}

export default function RestTimer({ exerciseName }: Props) {
  const [setSeconds, setSetSeconds] = useState(60);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inputText, setInputText] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgTimestampRef = useRef<number | null>(null);
  const remainingRef = useRef(remaining);

  useEffect(() => { remainingRef.current = remaining; }, [remaining]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY(exerciseName)).then(val => {
      if (val) {
        const n = parseInt(val);
        if (!isNaN(n) && n > 0) setSetSeconds(n);
      }
    });
  }, [exerciseName]);

  // Interval management
  useEffect(() => {
    if (running && !paused) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setPaused(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
              Vibration.vibrate([0, 300, 200, 300]);
            });
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, paused]);

  // AppState: correct elapsed time after returning from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        bgTimestampRef.current = Date.now();
      } else if (state === 'active' && bgTimestampRef.current !== null) {
        if (running && !paused) {
          const elapsed = Math.round((Date.now() - bgTimestampRef.current) / 1000);
          setRemaining(r => Math.max(0, r - elapsed));
        }
        bgTimestampRef.current = null;
      }
    });
    return () => sub.remove();
  }, [running, paused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const applySeconds = async (n: number) => {
    const clamped = Math.max(5, Math.min(3600, n));
    setSetSeconds(clamped);
    await AsyncStorage.setItem(STORAGE_KEY(exerciseName), String(clamped));
  };

  const addPreset = (p: number) => applySeconds(setSeconds + p);
  const adjust = (delta: number) => applySeconds(setSeconds + delta);

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
  };

  const start = () => {
    setRemaining(setSeconds);
    setRunning(true);
    setPaused(false);
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

  const progress = remaining > 0 ? ((setSeconds - remaining) / setSeconds) * 100 : 0;
  const isActive = running || remaining > 0;

  return (
    <View style={[{ backgroundColor: '#fff', borderRadius: 30, padding: 18, marginBottom: 12 }, SHADOW]}>
      {/* 헤더 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="clock" size={16} color="#7E9A90" />
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#34514A' }}>휴식 타이머</Text>
          {exerciseName && (
            <Text style={{ fontSize: 11, color: '#B4CFC5', fontWeight: '600' }}>· {exerciseName}</Text>
          )}
        </View>
        {isActive && (
          <TouchableOpacity
            onPress={reset}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="refresh" size={16} color="#E76C86" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#E76C86' }}>리셋</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 설정 시간 + +/- */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 14 }}>
        <TouchableOpacity
          onPress={() => adjust(-5)}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E7F7F0', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#7E9A90', marginTop: -2 }}>−</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 34, fontWeight: '900', color: '#34514A', letterSpacing: -1 }}>
            {formatTime(setSeconds)}
          </Text>
          <Text style={{ fontSize: 10, color: '#B4CFC5', fontWeight: '600', marginTop: 2 }}>설정 시간 (5초 단위)</Text>
        </View>
        <TouchableOpacity
          onPress={() => adjust(5)}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#6FD3B6', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', marginTop: -2 }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* 프리셋 */}
      <View style={{ flexDirection: 'row', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <TouchableOpacity
            key={p.seconds}
            onPress={() => addPreset(p.seconds)}
            style={{ flex: 1, minWidth: 50, borderRadius: 999, paddingVertical: 7, alignItems: 'center', backgroundColor: '#FFF1E3' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#E6932F' }}>+{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 직접 입력 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Text style={{ fontSize: 12, color: '#7E9A90', fontWeight: '700' }}>직접 입력</Text>
        <TextInput
          value={inputText}
          onChangeText={handleInput}
          keyboardType="numeric"
          selectTextOnFocus
          placeholder={String(setSeconds)}
          style={{
            flex: 1, backgroundColor: '#E7F7F0', borderRadius: 12,
            paddingVertical: 7, paddingHorizontal: 12,
            textAlign: 'center', fontSize: 15, fontWeight: '800', color: '#34514A',
          }}
          placeholderTextColor="#B4CFC5"
        />
        <Text style={{ fontSize: 12, color: '#7E9A90', fontWeight: '700' }}>초</Text>
      </View>

      {/* 타이머 / 시작 버튼 */}
      {isActive ? (
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={{ width: '100%', height: 8, backgroundColor: '#E7F7F0', borderRadius: 999, overflow: 'hidden' }}>
            <View style={{
              height: '100%', backgroundColor: paused ? '#B4CFC5' : '#FFC078', borderRadius: 999,
              width: `${progress}%` as `${number}%`,
            }} />
          </View>
          <Text style={{
            fontSize: 48, fontWeight: '900', letterSpacing: -2,
            color: paused ? '#B4CFC5' : remaining <= 10 ? '#FF8FA0' : '#E6932F',
          }}>
            {formatTime(remaining)}
          </Text>
          {/* 일시정지 / 재개 버튼 */}
          <TouchableOpacity
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              backgroundColor: paused ? '#6FD3B6' : '#FFF1E3',
              borderRadius: 999, paddingVertical: 10, paddingHorizontal: 28, width: '100%',
            }}
            onPress={togglePause}
            activeOpacity={0.8}>
            <Text style={{ fontSize: 22 }}>{paused ? '▶' : '⏸'}</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: paused ? '#fff' : '#E6932F' }}>
              {paused ? '재개' : '일시정지'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={{
            flexDirection: 'row', backgroundColor: '#FFC078', borderRadius: 999,
            paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
          onPress={start}
          activeOpacity={0.8}>
          <PlayIcon size={18} color="#fff" />
          <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff' }}>
            시작 ({formatTime(setSeconds)})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
