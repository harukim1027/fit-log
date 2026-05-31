import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useColors } from '../../constants/colors';

export interface NumberPadProps {
  visible: boolean;
  value: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  decimal?: boolean;
  suffix?: string;
  max?: number;
}

export function NumberPad({ visible, value, onConfirm, onCancel, decimal = true, suffix, max }: NumberPadProps) {
  const c = useColors();
  const [input, setInput] = useState(value);
  const isFirstKey = useRef(true);

  useEffect(() => {
    if (visible) {
      setInput(value || '0');
      isFirstKey.current = true;
    }
  }, [visible]);

  const press = (key: string) => {
    if (key === '←') {
      isFirstKey.current = false;
      setInput(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    } else if (key === '.') {
      if (input.includes('.')) return;
      isFirstKey.current = false;
      setInput(prev => prev + '.');
    } else {
      if (isFirstKey.current) {
        isFirstKey.current = false;
        setInput(key);
      } else {
        setInput(prev => (prev === '0' ? key : prev + key));
      }
    }
  };

  const handleConfirm = () => {
    let v = input || '0';
    if (max !== undefined) {
      const num = parseFloat(v);
      if (!isNaN(num) && num > max) v = String(max);
    }
    onConfirm(v);
  };

  const keyRows: (string | null)[][] = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    [decimal ? '.' : null, '0', '←'],
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onCancel} />
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36 }}>
          <View style={{ width: 36, height: 4, backgroundColor: c.surfaceHigh, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

          <View style={{ alignItems: 'center', backgroundColor: c.surfaceAlt, borderRadius: 18, paddingVertical: 18, marginBottom: 16 }}>
            <Text style={{ fontSize: 44, fontWeight: '800', color: c.textPrimary, letterSpacing: -1 }}>
              {input}
              {suffix ? (
                <Text style={{ fontSize: 20, fontWeight: '600', color: c.textMuted }}>{' '}{suffix}</Text>
              ) : null}
            </Text>
          </View>

          {keyRows.map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              {row.map((key, ki) => {
                if (key === null) {
                  return <View key={ki} style={{ flex: 1 }} />;
                }
                const isBack = key === '←';
                return (
                  <TouchableOpacity key={ki}
                    style={{
                      flex: 1, height: 62, borderRadius: 16,
                      backgroundColor: isBack ? c.surfaceHigh : c.surfaceAlt,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                    onPress={() => press(key)}
                    activeOpacity={0.65}>
                    <Text style={{ fontSize: isBack ? 18 : 24, fontWeight: isBack ? '500' : '700', color: isBack ? c.textMuted : c.textPrimary }}>
                      {key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity
              style={{ flex: 1, height: 56, borderRadius: 16, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}
              onPress={onCancel}
              activeOpacity={0.8}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: c.textSecondary }}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 2, height: 56, borderRadius: 16, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}
              onPress={handleConfirm}
              activeOpacity={0.8}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: c.onAccent }}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
