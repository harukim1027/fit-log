import { View, Text, TouchableOpacity } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui';

const PRESETS = [30, 60, 90, 120, 180];

export default function RestTimer() {
  const [seconds, setSeconds] = useState(60);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<any>(null);

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
    <Card className="mb-3">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-[15px] font-bold text-text-primary">⏱ 휴식 타이머</Text>
        {running && (
          <TouchableOpacity onPress={stop}>
            <Ionicons name="stop-circle-outline" size={22} color="#F4ADAD" />
          </TouchableOpacity>
        )}
      </View>

      <View className="flex-row gap-1 mb-3">
        {PRESETS.map(p => {
          const isActive = seconds === p;
          return (
            <TouchableOpacity
              key={p}
              className={[
                "flex-1 py-[7px] items-center rounded-[20px]",
                isActive ? "bg-workout/30" : "bg-surface-alt",
              ].join(" ")}
              onPress={() => { setSeconds(p); if (!running) setRemaining(0); }}>
              <Text
                className={[
                  "text-xs font-semibold",
                  isActive ? "text-workout font-bold" : "text-text-secondary",
                ].join(" ")}>
                {p >= 60 ? p / 60 + '분' : p + '초'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {running || remaining > 0 ? (
        <View className="items-center gap-2">
          <View className="w-full h-2 bg-surface-alt rounded-full overflow-hidden">
            <View
              className="h-full bg-workout rounded-full"
              style={{ width: `${progressPct}%` as `${number}%` }}
            />
          </View>
          <Text
            className={[
              "text-[36px] font-extrabold",
              remaining <= 10 ? "text-danger" : "text-workout",
            ].join(" ")}>
            {formatTime(remaining)}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          className="flex-row bg-workout rounded-[20px] py-[11px] items-center justify-center gap-1"
          onPress={start}
          activeOpacity={0.8}>
          <Ionicons name="play" size={18} color="#fff" />
          <Text className="text-[15px] font-bold text-white">시작</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}
