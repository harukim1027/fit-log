import React from "react";
import { View, Text, ViewProps } from "react-native";

export type BadgeColor =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "diet"
  | "workout"
  | "water"
  | "stats"
  | "neutral";

export interface BadgeProps extends ViewProps {
  label: string;
  color?: BadgeColor;
  size?: "sm" | "md";
  dot?: boolean;
}

const bg: Record<BadgeColor, string> = {
  primary:  "bg-primary/20",
  success:  "bg-success/20",
  warning:  "bg-warning/20",
  danger:   "bg-danger/20",
  diet:     "bg-diet/20",
  workout:  "bg-workout/20",
  water:    "bg-water/20",
  stats:    "bg-stats/20",
  neutral:  "bg-surface-alt",
};

const text: Record<BadgeColor, string> = {
  primary:  "text-primary",
  success:  "text-success",
  warning:  "text-warning",
  danger:   "text-danger",
  diet:     "text-diet",
  workout:  "text-workout",
  water:    "text-water",
  stats:    "text-stats",
  neutral:  "text-text-secondary",
};

const dotBg: Record<BadgeColor, string> = {
  primary:  "bg-primary",
  success:  "bg-success",
  warning:  "bg-warning",
  danger:   "bg-danger",
  diet:     "bg-diet",
  workout:  "bg-workout",
  water:    "bg-water",
  stats:    "bg-stats",
  neutral:  "bg-text-muted",
};

export function Badge({
  label,
  color = "primary",
  size = "md",
  dot = false,
  className,
  ...props
}: BadgeProps) {
  return (
    <View
      className={[
        "flex-row items-center rounded-full",
        bg[color],
        size === "sm" ? "px-2 py-0.5" : "px-3 py-1",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}>
      {dot && (
        <View
          className={[
            "rounded-full mr-1",
            dotBg[color],
            size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
          ].join(" ")}
        />
      )}
      <Text
        className={[
          text[color],
          "font-semibold",
          size === "sm" ? "text-xs" : "text-xs",
        ].join(" ")}>
        {label}
      </Text>
    </View>
  );
}
