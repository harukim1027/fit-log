import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Colors } from '../constants/colors';

interface Props {
  onDone: () => void;
}

export default function KeyboardToolbar({ onDone }: Props) {
  if (Platform.OS !== 'ios') return null;
  return (
    <View style={s.toolbar}>
      <TouchableOpacity style={s.doneBtn} onPress={onDone}>
        <Text style={s.doneText}>완료</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  toolbar: { backgroundColor: Colors.surfaceAlt, borderTopWidth: 1, borderTopColor: Colors.border, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', justifyContent: 'flex-end' },
  doneBtn: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: Colors.primary, borderRadius: 8 },
  doneText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
