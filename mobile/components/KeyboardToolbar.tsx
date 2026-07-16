import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { useColors } from '../constants/colors';

interface Props {
  onDone: () => void;
}

export default function KeyboardToolbar({ onDone }: Props) {
  const c = useColors();
  if (Platform.OS !== 'ios') return null;
  return (
    <View style={{ backgroundColor: c.surfaceAlt, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', justifyContent: 'flex-end' }}>
      <TouchableOpacity activeOpacity={0.8} style={{ paddingHorizontal: 16, paddingVertical: 6, backgroundColor: c.primary, borderRadius: 8 }} onPress={onDone}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>완료</Text>
      </TouchableOpacity>
    </View>
  );
}
