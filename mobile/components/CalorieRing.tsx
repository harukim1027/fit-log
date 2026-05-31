import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useColors } from '../constants/colors';

interface Props {
  consumed: number;
  target: number;
  size?: number;
}

export default function CalorieRing({ consumed, target, size = 160 }: Props) {
  const c = useColors();
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
            <Stop offset="0" stopColor={c.primary} stopOpacity="0.6" />
            <Stop offset="1" stopColor={c.primary} />
          </LinearGradient>
          <LinearGradient id="ringOver" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.danger} />
            <Stop offset="1" stopColor={c.danger} stopOpacity="0.75" />
          </LinearGradient>
        </Defs>
        {/* track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={c.border} strokeWidth={strokeWidth} fill="none"
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
        <Text style={{ fontSize: 32, fontWeight: '900', color: over ? c.danger : c.success, letterSpacing: -1 }}>
          {consumed}
        </Text>
        <Text style={{ fontSize: 11, color: c.textSecondary, fontWeight: '700', marginTop: 1 }}>kcal</Text>
        <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '700' }}>/ {target}</Text>
      </View>
    </View>
  );
}
