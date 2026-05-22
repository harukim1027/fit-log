import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const PRESETS = [30, 60, 90, 120, 180];

export default function RestTimer() {
  const [seconds, setSeconds] = useState(60);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<any>(null);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) {
            setRunning(false);
            clearInterval(intervalRef.current);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const start = () => {
    setRemaining(seconds);
    setRunning(true);
  };

  const stop = () => {
    setRunning(false);
    setRemaining(0);
    clearInterval(intervalRef.current);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m + ':' + String(sec).padStart(2, '0');
  };

  const progressPct = remaining > 0 ? ((seconds - remaining) / seconds) * 100 : 0;

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Text style={s.title}>⏱ 휴식 타이머</Text>
        {running && (
          <TouchableOpacity onPress={stop}>
            <Ionicons name="stop-circle-outline" size={22} color={Colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      <View style={s.presets}>
        {PRESETS.map(p => (
          <TouchableOpacity
            key={p}
            style={[s.presetBtn, seconds === p && s.presetBtnActive]}
            onPress={() => { setSeconds(p); if (!running) setRemaining(0); }}
          >
            <Text style={[s.presetText, seconds === p && s.presetTextActive]}>
              {p >= 60 ? p/60 + '분' : p + '초'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {running || remaining > 0 ? (
        <View style={s.timerArea}>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: progressPct + '%' }]} />
          </View>
          <Text style={[s.timerText, remaining <= 10 && s.timerTextRed]}>
            {formatTime(remaining)}
          </Text>
        </View>
      ) : (
        <TouchableOpacity style={s.startBtn} onPress={start} activeOpacity={0.8}>
          <Ionicons name="play" size={18} color="#fff" />
          <Text style={s.startBtnText}>시작</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  presets: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  presetBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 8, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  presetBtnActive: { backgroundColor: Colors.workout + '20', borderColor: Colors.workout },
  presetText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  presetTextActive: { color: Colors.workout, fontWeight: '700' },
  timerArea: { alignItems: 'center', gap: 8 },
  progressBg: { width: '100%', height: 6, backgroundColor: Colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.workout, borderRadius: 3 },
  timerText: { fontSize: 36, fontWeight: '800', color: Colors.workout },
  timerTextRed: { color: Colors.danger },
  startBtn: { flexDirection: 'row', backgroundColor: Colors.workout, borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 6 },
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
