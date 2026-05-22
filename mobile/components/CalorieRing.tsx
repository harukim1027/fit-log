import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../constants/colors';

interface Props {
  consumed: number;
  target: number;
  size?: number;
}

export default function CalorieRing({ consumed, target, size = 180 }: Props) {
  const progress = Math.min(consumed / target, 1);
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * (1 - progress);
  const color = progress >= 1 ? Colors.danger : Colors.diet;

  return (
    <View style={[r.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.surfaceAlt}
          strokeWidth={12}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={12}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDash}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={r.center}>
        <Text style={[r.consumed, { color }]}>{consumed}</Text>
        <Text style={r.unit}>kcal</Text>
        <Text style={r.target}>/ {target}</Text>
      </View>
    </View>
  );
}

const r = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  consumed: { fontSize: 32, fontWeight: '800' },
  unit: { fontSize: 13, color: Colors.textSecondary, marginTop: -2 },
  target: { fontSize: 12, color: Colors.textMuted },
});
