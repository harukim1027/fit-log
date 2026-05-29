import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

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
  const color = progress >= 1 ? '#F4ADAD' : '#A8DCC8';

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#EDE8F8"
          strokeWidth={14}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={14}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDash}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View className="absolute items-center">
        <Text className="font-extrabold" style={{ fontSize: 30, color }}>
          {consumed}
        </Text>
        <Text className="text-xs text-text-secondary" style={{ marginTop: -2 }}>
          kcal
        </Text>
        <Text className="text-text-muted" style={{ fontSize: 11 }}>
          / {target}
        </Text>
      </View>
    </View>
  );
}
