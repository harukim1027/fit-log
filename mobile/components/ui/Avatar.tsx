import React from "react";
import { View, Text, Image, ImageSourcePropType, ViewProps } from "react-native";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarProps extends ViewProps {
  name?: string;
  source?: ImageSourcePropType;
  size?: AvatarSize;
  /** 배지(알림 점 등) 표시 */
  badge?: boolean;
  badgeColor?: string;
}

const sizePx: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 44,
  lg: 56,
  xl: 72,
};

const textSize: Record<AvatarSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-2xl",
};

const badgeSizePx: Record<AvatarSize, number> = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({
  name,
  source,
  size = "md",
  badge = false,
  badgeColor = "#6FD3B6",
  className,
  style,
  ...props
}: AvatarProps) {
  const px = sizePx[size];
  const badgePx = badgeSizePx[size];

  return (
    <View
      className={["relative", className ?? ""].filter(Boolean).join(" ")}
      style={[{ width: px, height: px }, style]}
      {...props}>
      {source ? (
        <Image
          source={source}
          style={{ width: px, height: px, borderRadius: px / 2 }}
          resizeMode="cover"
        />
      ) : (
        <View
          className="bg-primary/20 items-center justify-center"
          style={{ width: px, height: px, borderRadius: px / 2 }}>
          <Text className={["text-primary font-bold", textSize[size]].join(" ")}>
            {name ? getInitials(name) : "?"}
          </Text>
        </View>
      )}

      {badge && (
        <View
          className="absolute bottom-0 right-0 rounded-full border-2 border-background"
          style={{
            width: badgePx,
            height: badgePx,
            backgroundColor: badgeColor,
          }}
        />
      )}
    </View>
  );
}
