import { View, Text, TouchableOpacity } from "react-native";
import { Icon } from "./AppIcons";

const SHADOW = {
  shadowColor: "#4EBFA0",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.2,
  shadowRadius: 24,
  elevation: 4,
};

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
  onReset: () => void;
  onEnd: () => void;
}

export default function WorkoutTimer({
  exerciseCount,
  totalVolume,
  elapsed,
  paused,
  onPausedChange,
  onReset,
  onEnd,
}: Props) {
  return (
    <View
      style={[
        {
          backgroundColor: "#fff",
          borderRadius: 30,
          padding: 18,
          marginBottom: 12,
        },
        SHADOW,
      ]}>
      {/* 상단: 운동 중 + 저장 및 종료 */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: "900", color: "#34514A" }}>
            운동 중
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#7E9A90",
              marginTop: 3,
            }}>
            {exerciseCount}종목 · 총 볼륨 {totalVolume.toLocaleString()}kg
          </Text>
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: "#E7F7F0",
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 9,
          }}
          onPress={onEnd}
          activeOpacity={0.8}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: "#2E9E83" }}>
            저장 및 종료
          </Text>
        </TouchableOpacity>
      </View>

      {/* 구분선 */}
      <View
        style={{ height: 1, backgroundColor: "#E7F7F0", marginVertical: 12 }}
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
            color: paused ? "#B4CFC5" : "#34514A",
          }}>
          {formatElapsed(elapsed)}
        </Text>

        {/* 리셋 버튼 */}
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          onPress={onReset}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="refresh" size={16} color="#E76C86" />
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#E76C86" }}>
            리셋
          </Text>
        </TouchableOpacity>

        {/* 일시정지/재개 버튼 */}
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            backgroundColor: paused ? "#6FD3B6" : "#FFF1E3",
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
              color: paused ? "#fff" : "#E6932F",
            }}>
            {paused ? "재개" : "일시정지"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
