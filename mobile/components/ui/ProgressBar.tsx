import React from "react";
import { View, Text, ViewProps, StyleSheet } from "react-native";

export type ProgressColor = "primary" | "success" | "warning" | "danger" | "diet" | "workout" | "water";

export interface ProgressBarProps extends ViewProps {
  /** 0–1 */
  value: number;
  color?: ProgressColor;
  height?: number;
  showLabel?: boolean;
  label?: string;
  trackClassName?: string;
}

const fillColor: Record<ProgressColor, string> = {
  primary: "#B4A7E8",
  success: "#A8DCC8",
  warning: "#FFCBA4",
  danger:  "#F4ADAD",
  diet:    "#A8DCC8",
  workout: "#F4B8A8",
  water:   "#A8C8F0",
};

export function ProgressBar({
  value,
  color = "primary",
  height = 8,
  showLabel = false,
  label,
  trackClassName,
  className,
  style,
  ...props
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 1);
  const pct = `${Math.round(clamped * 100)}%` as `${number}%`;

  return (
    <View className={["w-full", className ?? ""].filter(Boolean).join(" ")} {...props}>
      {(showLabel || label) && (
        <View className="flex-row justify-between items-center mb-1">
          {label && (
            <Text className="text-text-secondary text-xs font-semibold">
              {label}
            </Text>
          )}
          {showLabel && (
            <Text className="text-text-muted text-xs">{pct}</Text>
          )}
        </View>
      )}

      {/* Track */}
      <View
        className={[
          "w-full bg-surface-alt rounded-full overflow-hidden",
          trackClassName ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ height }}>
        {/* Fill */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              width: pct,
              backgroundColor: fillColor[color],
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
    </View>
  );
}
