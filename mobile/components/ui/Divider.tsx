import React from "react";
import { View, Text, ViewProps } from "react-native";

export interface DividerProps extends ViewProps {
  /** 중앙 텍스트 라벨 */
  label?: string;
  /** 구분선 방향 */
  orientation?: "horizontal" | "vertical";
  thickness?: number;
}

export function Divider({
  label,
  orientation = "horizontal",
  thickness = 1,
  className,
  style,
  ...props
}: DividerProps) {
  if (orientation === "vertical") {
    return (
      <View
        className={["bg-border self-stretch", className ?? ""]
          .filter(Boolean)
          .join(" ")}
        style={[{ width: thickness }, style]}
        {...props}
      />
    );
  }

  if (label) {
    return (
      <View
        className={["flex-row items-center my-3", className ?? ""]
          .filter(Boolean)
          .join(" ")}
        {...props}>
        <View className="flex-1 bg-border" style={{ height: thickness }} />
        <Text className="text-text-muted text-xs font-semibold mx-3">
          {label}
        </Text>
        <View className="flex-1 bg-border" style={{ height: thickness }} />
      </View>
    );
  }

  return (
    <View
      className={["bg-border w-full my-3", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      style={[{ height: thickness }, style]}
      {...props}
    />
  );
}
