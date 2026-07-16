import { View, Text, TouchableOpacity } from "react-native";
import { Icon } from "./AppIcons";
import { useColors } from "../constants/colors";
import { useWorkoutStore } from "../store/workoutStore";

const formatElapsed = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    sec
  ).padStart(2, "0")}`;
};

interface Props {
  exerciseCount: number;
  totalVolume: number;
  paused: boolean;
  onPausedChange: (v: boolean) => void;
  onEnd: () => void;
}

export default function WorkoutTimer({
  exerciseCount,
  totalVolume,
  paused,
  onPausedChange,
  onEnd,
}: Props) {
  const c = useColors();
  // 경과 시간은 1초마다 갱신되므로 이 컴포넌트에서 직접 구독한다.
  // (부모 WorkoutScreen이 구독하면 매초 전체 종목/세트 트리가 리렌더돼 입력이 버벅임)
  const elapsed = useWorkoutStore((s) => s.workoutElapsed);
  const SHADOW = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  };
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 30,
          padding: 18,
          marginBottom: 12,
        },
        SHADOW,
      ]}>
      {/* 상단: 운동 중 + 운동 종료 */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: "900", color: c.textPrimary }}>
            운동 중
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: c.textSecondary,
              marginTop: 3,
            }}>
            {exerciseCount}종목 · 총 볼륨 {totalVolume.toLocaleString()}kg
          </Text>
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: c.surfaceAlt,
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 9,
          }}
          onPress={onEnd}
          activeOpacity={0.8}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: c.success }}>
            운동 종료
          </Text>
        </TouchableOpacity>
      </View>

      {/* 구분선 */}
      <View
        style={{ height: 1, backgroundColor: c.surfaceAlt, marginVertical: 12 }}
      />

      {/* 하단: 경과 시간 + 컨트롤 */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {/* 경과 시간 */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: "900",
            letterSpacing: -1,
            flex: 1,
            color: paused ? c.textMuted : c.textPrimary,
          }}>
          {formatElapsed(elapsed)}
        </Text>

        {/* 일시정지/재개 버튼 */}
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            backgroundColor: paused ? c.primary : c.warning + '18',
            borderRadius: 999,
            paddingVertical: 8,
            paddingHorizontal: 16,
          }}
          onPress={() => onPausedChange(!paused)}
          activeOpacity={0.8}>
          <Icon name={paused ? "play" : "stop"} size={14} color={paused ? c.surface : c.warning} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "800",
              color: paused ? c.surface : c.warning,
            }}>
            {paused ? "재개" : "일시정지"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
