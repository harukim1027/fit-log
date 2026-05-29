import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWaterStore } from '../store/waterStore';
import { Card, ProgressBar } from './ui';

const PRESETS = [150, 200, 250, 500];

export default function WaterTracker() {
  const { total, target, addWater, resetWater } = useWaterStore();
  const progress = Math.min(total / target, 1);
  const cups = Math.floor(total / 250);

  return (
    <Card className="mb-4">
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center gap-2">
          <View className="w-[34px] h-[34px] rounded-xl bg-water/30 items-center justify-center">
            <Text className="text-base">💧</Text>
          </View>
          <Text className="text-base font-bold text-text-primary">물 섭취</Text>
        </View>
        <TouchableOpacity onPress={resetWater}>
          <Ionicons name="refresh-outline" size={18} color="#C4B8D4" />
        </TouchableOpacity>
      </View>

      <View className="flex-row items-baseline gap-1 mb-2">
        <Text className="text-[22px] font-bold text-water">{total}ml</Text>
        <Text className="text-sm text-text-secondary">/ {target}ml</Text>
      </View>

      <ProgressBar value={progress} color="water" className="mb-3" />

      <View className="flex-row gap-1 mb-3">
        {[...Array(8)].map((_, i) => (
          <View key={i} className="flex-1 items-center">
            <Text className="text-[20px]">{i < cups ? '💧' : '🫙'}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row gap-2">
        {PRESETS.map(amt => (
          <TouchableOpacity
            key={amt}
            className="flex-1 bg-water/20 rounded-[20px] py-2 items-center"
            onPress={() => addWater(amt)}
            activeOpacity={0.7}>
            <Text className="text-xs font-bold text-water">+{amt}ml</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
}
