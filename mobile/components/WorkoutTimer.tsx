import { View, Text, TouchableOpacity } from "react-native";
import { Icon } from "./AppIcons";
import { useColors } from "../constants/colors";

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
  elapsed: number;
  paused: boolean;
  onPausedChange: (v: boolean) => void;
  onEnd: () => void;
  onCancel: () => void;
}

export default function WorkoutTimer({
  exerciseCount,
  totalVolume,
  elapsed,
  paused,
  onPausedChange,
  onEnd,
  onCancel,
}: Props) {
  const c = useColors();
  const SHADOW = {
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 4,
  };
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: 30,
          padding: 18,
          marginBottom: 12,
        },
        SHADOW,
      ]}>
      {/* 상단: X버튼 + 운동 중 + 저장 및 종료 */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: c.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={onCancel}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close" size={14} color={c.textMuted} />
          </TouchableOpacity>
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
            저장 및 종료
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
          <Text style={{ fontSize: 14 }}>{paused ? "▶" : "⏸"}</Text>
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
