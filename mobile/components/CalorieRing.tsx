import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  consumed: number;
  target: number;
  size?: number;
}

export default function CalorieRing({ consumed, target, size = 160 }: Props) {
  const progress = Math.min(consumed / (target || 1), 1);
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * (1 - progress);
  const over = progress >= 1;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#9BE3CE" />
            <Stop offset="1" stopColor="#46B493" />
          </LinearGradient>
          <LinearGradient id="ringOver" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FF9DB0" />
            <Stop offset="1" stopColor="#FF8FA0" />
          </LinearGradient>
        </Defs>
        {/* track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#D6F0E6" strokeWidth={strokeWidth} fill="none"
        />
        {/* fill */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={over ? 'url(#ringOver)' : 'url(#ringGrad)'}
          strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDash}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 32, fontWeight: '900', color: over ? '#FF8FA0' : '#2E9E83', letterSpacing: -1 }}>
          {consumed}
        </Text>
        <Text style={{ fontSize: 11, color: '#7E9A90', fontWeight: '700', marginTop: 1 }}>kcal</Text>
        <Text style={{ fontSize: 11, color: '#B4CFC5', fontWeight: '700' }}>/ {target}</Text>
      </View>
    </View>
  );
}
