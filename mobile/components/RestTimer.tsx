import { View, Text, TouchableOpacity } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Icon, PlayIcon } from './AppIcons';

const PRESETS = [30, 60, 90, 120, 180];

const SHADOW = {
  shadowColor: "#4EBFA0",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.20,
  shadowRadius: 24,
  elevation: 4,
};

export default function RestTimer() {
  const [seconds, setSeconds] = useState(60);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { setRunning(false); clearInterval(intervalRef.current); return 0; }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const start = () => { setRemaining(seconds); setRunning(true); };
  const stop = () => { setRunning(false); setRemaining(0); clearInterval(intervalRef.current); };
  const formatTime = (s: number) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const progressPct = remaining > 0 ? ((seconds - remaining) / seconds) * 100 : 0;

  return (
    <View style={[{ backgroundColor: '#fff', borderRadius: 30, padding: 18, marginBottom: 12 }, SHADOW]}>
      {/* 헤더 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="clock" size={16} color="#7E9A90" />
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#34514A' }}>휴식 타이머</Text>
        </View>
        {running && (
          <TouchableOpacity onPress={stop}>
            <Icon name="refresh" size={20} color="#E76C86" />
          </TouchableOpacity>
        )}
      </View>

      {/* 프리셋 알약 */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
        {PRESETS.map(p => {
          const isActive = seconds === p;
          return (
            <TouchableOpacity
              key={p}
              style={{ flex: 1, borderRadius: 999, paddingVertical: 7, alignItems: 'center', backgroundColor: isActive ? '#FFF1E3' : '#E7F7F0' }}
              onPress={() => { setSeconds(p); if (!running) setRemaining(0); }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: isActive ? '#E6932F' : '#7E9A90' }}>
                {p >= 60 ? p / 60 + '분' : p + '초'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {running || remaining > 0 ? (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={{ width: '100%', height: 8, backgroundColor: '#E7F7F0', borderRadius: 999, overflow: 'hidden' }}>
            <View style={{ height: '100%', backgroundColor: '#FFC078', borderRadius: 999, width: `${progressPct}%` as `${number}%` }} />
          </View>
          <Text style={{ fontSize: 36, fontWeight: '900', color: remaining <= 10 ? '#FF8FA0' : '#E6932F', letterSpacing: -1 }}>
            {formatTime(remaining)}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={{ flexDirection: 'row', backgroundColor: '#FFC078', borderRadius: 999, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 6 }}
          onPress={start}
          activeOpacity={0.8}>
          <PlayIcon size={18} color="#fff" />
          <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff' }}>시작</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
