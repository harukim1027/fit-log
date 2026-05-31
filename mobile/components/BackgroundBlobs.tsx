import React from "react";
import { View } from "react-native";

/**
 * 화면 배경에 깔리는 은은한 블롭 3개.
 * SafeAreaView 바로 안, 콘텐츠보다 먼저 배치:
 *
 *   <SafeAreaView className="flex-1 bg-background" edges={...}>
 *     <BackgroundBlobs />
 *     ... 콘텐츠 ...
 *   </SafeAreaView>
 *
 * pointerEvents="none" 라 터치를 막지 않음.
 */
export function BackgroundBlobs() {
  return (
    <View pointerEvents="none" className="absolute inset-0 overflow-hidden">
      <View className="absolute -top-12 -right-10 w-56 h-56 rounded-full bg-primary/10" />
      <View className="absolute top-44 -left-14 w-44 h-44 rounded-full bg-warning/10" />
      <View className="absolute bottom-24 -right-12 w-40 h-40 rounded-full bg-danger/[0.08]" />
    </View>
  );
}

export default BackgroundBlobs;
