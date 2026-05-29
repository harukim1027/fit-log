import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon, PlayIcon } from './AppIcons';

const PRESETS_ROW1 = [5, 10, 15, 20, 30];
const PRESETS_ROW2 = [45, 60, 90, 120, 180];

const STORAGE_KEY = (name?: string) => `restTimer:${name ?? '_default_'}`;

const SHADOW = {
  shadowColor: "#4EBFA0",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.20,
  shadowRadius: 24,
  elevation: 4,
};

const formatLabel = (s: number) =>
  s >= 60 ? (s % 60 === 0 ? `${s / 60}분` : `${s / 60}분${s % 60}초`) : `${s}초`;

interface Props {
  exerciseName?: string;
}

export default function RestTimer({ exerciseName }: Props) {
  const [seconds, setSeconds] = useState(60);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [customText, setCustomText] = useState('60');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 종목별 마지막 설정값 로드
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY(exerciseName)).then(val => {
      if (val) {
        const n = parseInt(val);
        if (!isNaN(n) && n > 0) {
          setSeconds(n);
          setCustomText(String(n));
          if (!running) setRemaining(0);
        }
      }
    });
  }, [exerciseName]);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) {
            setRunning(false);
            clearInterval(intervalRef.current!);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const applySeconds = (n: number) => {
    setSeconds(n);
    setCustomText(String(n));
    if (!running) setRemaining(0);
    AsyncStorage.setItem(STORAGE_KEY(exerciseName), String(n));
  };

  const handlePreset = (p: number) => applySeconds(p);

  const handleCustomInput = (text: string) => {
    setCustomText(text);
    const n = parseInt(text);
    if (!isNaN(n) && n > 0 && n <= 3600) {
      setSeconds(n);
      AsyncStorage.setItem(STORAGE_KEY(exerciseName), String(n));
    }
  };

  const start = () => { setRemaining(seconds); setRunning(true); };
  const stop = () => {
    setRunning(false);
    setRemaining(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const formatTime = (s: number) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const progressPct = remaining > 0 ? ((seconds - remaining) / seconds) * 100 : 0;

  const PresetChip = ({ p }: { p: number }) => {
    const isActive = seconds === p;
    return (
      <TouchableOpacity
        style={{
          flex: 1, borderRadius: 999, paddingVertical: 6, alignItems: 'center',
          backgroundColor: isActive ? '#FFF1E3' : '#E7F7F0',
        }}
        onPress={() => handlePreset(p)}>
        <Text style={{ fontSize: 10.5, fontWeight: '800', color: isActive ? '#E6932F' : '#7E9A90' }}>
          {formatLabel(p)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[{ backgroundColor: '#fff', borderRadius: 30, padding: 18, marginBottom: 12 }, SHADOW]}>
      {/* 헤더 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="clock" size={16} color="#7E9A90" />
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#34514A' }}>휴식 타이머</Text>
          {exerciseName && (
            <Text style={{ fontSize: 11, color: '#B4CFC5', fontWeight: '600' }}>· {exerciseName}</Text>
          )}
        </View>
        {running && (
          <TouchableOpacity onPress={stop}>
            <Icon name="refresh" size={20} color="#E76C86" />
          </TouchableOpacity>
        )}
      </View>

      {/* 프리셋 1행 */}
      <View style={{ flexDirection: 'row', gap: 5, marginBottom: 5 }}>
        {PRESETS_ROW1.map(p => <PresetChip key={p} p={p} />)}
      </View>

      {/* 프리셋 2행 */}
      <View style={{ flexDirection: 'row', gap: 5, marginBottom: 10 }}>
        {PRESETS_ROW2.map(p => <PresetChip key={p} p={p} />)}
      </View>

      {/* 직접 입력 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text style={{ fontSize: 12, color: '#7E9A90', fontWeight: '700' }}>직접 입력</Text>
        <TextInput
          value={customText}
          onChangeText={handleCustomInput}
          keyboardType="numeric"
          selectTextOnFocus
          style={{
            flex: 1, backgroundColor: '#E7F7F0', borderRadius: 12,
            paddingVertical: 7, paddingHorizontal: 12,
            textAlign: 'center', fontSize: 15, fontWeight: '800', color: '#34514A',
          }}
          placeholderTextColor="#B4CFC5"
          placeholder="초"
        />
        <Text style={{ fontSize: 12, color: '#7E9A90', fontWeight: '700' }}>초</Text>
      </View>

      {running || remaining > 0 ? (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={{ width: '100%', height: 8, backgroundColor: '#E7F7F0', borderRadius: 999, overflow: 'hidden' }}>
            <View style={{
              height: '100%', backgroundColor: '#FFC078', borderRadius: 999,
              width: `${progressPct}%` as `${number}%`,
            }} />
          </View>
          <Text style={{
            fontSize: 36, fontWeight: '900', letterSpacing: -1,
            color: remaining <= 10 ? '#FF8FA0' : '#E6932F',
          }}>
            {formatTime(remaining)}
          </Text>
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
            시작 ({formatLabel(seconds)})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
