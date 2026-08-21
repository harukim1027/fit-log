import React from "react";
import type { Preview } from "@storybook/react";
import { useThemeStore } from "../store/themeStore";

/**
 * 배경/뷰포트 값은 mobile/constants/colors.ts와 DESIGN.md에 맞춘다.
 * - 배경: L0 캔버스 토큰 (다크 #171B21 / 라이트 #F2F6FB)
 * - 뷰포트: DESIGN.md layout_platforms.minimum_width_px = 320
 *
 * Storybook 9에서 backgrounds/viewport 파라미터 형식이 바뀌었다.
 * values 배열 + default 문자열 → options 객체 + initialGlobals.
 * 예전 형식을 쓰면 오류 없이 조용히 무시돼 기본 배경이 흰색으로 남는다.
 */
const preview: Preview = {
  decorators: [
    /**
     * 배경 전역값과 앱 테마를 묶는다.
     *
     * 이게 없으면 배경 툴바는 캔버스 색만 바꾸고 useColors()는 계속 themeStore의
     * 기본값(dark)을 반환한다. 그 결과 라이트 배경 위에 다크 테마 텍스트가 얹혀
     * 대비가 무너지고 a11y 위반으로 잡힌다(실제로 그렇게 나왔다).
     * 배경을 바꾸면 컴포넌트 테마도 함께 바뀌어야 "다크/라이트 대비 확인"이 성립한다.
     */
    (Story, context) => {
      const mode = context.globals?.backgrounds?.value === "light" ? "light" : "dark";
      // 값이 다를 때만 쓴다 — 렌더 루프 방지.
      if (useThemeStore.getState().mode !== mode) {
        useThemeStore.setState({ mode });
      }
      return <Story />;
    },
  ],
  parameters: {
    backgrounds: {
      options: {
        dark: { name: "Dark", value: "#171B21" },
        light: { name: "Light", value: "#F2F6FB" },
      },
    },
    viewport: {
      options: {
        iphoneSE: {
          name: "iPhone SE (최소 지원 폭 320)",
          styles: { width: "320px", height: "568px" },
          type: "mobile",
        },
        iphone14: {
          name: "iPhone 14",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
        iphone14Pro: {
          name: "iPhone 14 Pro",
          styles: { width: "393px", height: "852px" },
          type: "mobile",
        },
      },
    },
  },
  initialGlobals: {
    backgrounds: { value: "dark" },
    viewport: { value: "iphone14", isRotated: false },
  },
};

export default preview;
