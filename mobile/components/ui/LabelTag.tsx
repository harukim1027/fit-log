import React from "react";
import { View, Text } from "react-native";

interface LabelTagProps {
  label: string;
  color: string;
  style?: object;
}

export function LabelTag({ label, color, style }: LabelTagProps) {
  return (
    <View
      style={[
        {
          position: "absolute",
          top: -14,
          left: 16,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: color,
          borderRadius: 999,
          paddingLeft: 10,
          paddingRight: 14,
          paddingVertical: 5,
          transform: [{ rotate: "-3deg" }],
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.22,
          shadowRadius: 4,
          elevation: 4,
          zIndex: 10,
        },
        style,
      ]}>
      {/* 끈구멍 */}
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: "rgba(0,0,0,0.25)",
          marginRight: 7,
        }}
      />
      <Text
        style={{
          fontSize: 12,
          fontWeight: "800",
          color: "#FFFFFF",
          letterSpacing: 0.3,
        }}>
        {label}
      </Text>
    </View>
  );
}
