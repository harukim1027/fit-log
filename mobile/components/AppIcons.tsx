// ============================================================
// AppIcons.tsx — FitLog 파스텔 민트 손그림 아이콘 세트
// react-native-svg 로 작성 (앱에 이미 설치됨 — CalorieRing 에서 사용 중)
//
// 사용:
//   import { Icon, FlameIcon, WaterMascot } from "@/components/AppIcons";
//   <Icon name="dumbbell" size={24} color="#E6932F" />   // 단색 라인 아이콘
//   <FlameIcon size={16} />                                // 멀티컬러(채움) 아이콘
//
// Ionicons 교체 매핑(권장):
//   home-outline → <Icon name="home"/>      nutrition-outline → <Icon name="apple"/>
//   barbell-outline → <Icon name="dumbbell"/>  bar-chart-outline → <Icon name="chart"/>
//   add → <Icon name="plus"/>   checkmark → <Icon name="check"/>   trash-outline → <Icon name="trash"/>
//   chevron-forward/back → <Icon name="chevronRight/Left"/>  play → <Icon name="play"/>
//   timer-outline → <Icon name="clock"/>  refresh-outline → <Icon name="refresh"/>
//   trophy → <Icon name="trophy"/>  person-circle-outline → <Icon name="person"/>  log-out-outline → <Icon name="logout"/>
//   flame → <FlameIcon/>  settings-outline → 아바타(FaceAvatar) 또는 <Icon name="refresh"/>
// ============================================================
import React from "react";
import Svg, { Path, Circle, Ellipse, G, Line, LinearGradient, Stop } from "react-native-svg";

// 팔레트(참고)
export const MINT = {
  mint: "#6FD3B6", mintInk: "#2E9E83", mintDeep: "#46B493",
  peach: "#FFC078", peachInk: "#E6932F",
  pink: "#FF9DB0", sky: "#8FC7F5", skyInk: "#3F8DD6", yellow: "#FFD36E", yellowInk: "#D9A100",
  ink: "#34514A", sub: "#7E9A90", muted: "#B4CFC5",
};

type IconProps = { size?: number; color?: string };

// ── 단색 라인 아이콘 (stroke) ───────────────────────────────
const LINE_PATHS: Record<string, string> = {
  home: "M4 11.5 12 4l8 7.5M6 10v9h4v-5h4v5h4v-9",
  apple: "M12 8c-2-3-8-2-8 4 0 6 5 10 8 10s8-4 8-10c0-6-6-7-8-4ZM12 8V4",
  dumbbell: "M6 8v8M4 10v4M18 8v8M20 10v4M6 12h12",
  chart: "M5 20V11M12 20V5M19 20v-6",
  check: "M5 13l4 4 10-11",
  chevronRight: "M9 6l6 6-6 6",
  chevronLeft: "M15 6l-6 6 6 6",
  chevronUp: "M6 15l6-6 6 6",
  chevronDown: "M6 9l6 6 6-6",
  plus: "M12 5v14M5 12h14",
  trash: "M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13",
  clock: "M12 13v4l2.5 1.5M9 3h6", // + circle (handled below)
  refresh: "M4 5v5h5M20 19v-5h-5M19 9a7 7 0 0 0-12-3M5 15a7 7 0 0 0 12 3",
  trophy: "M7 4h10v4a5 5 0 0 1-10 0V4ZM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 0-3 3M9.5 18h5M12 14v4",
  person: "M5 20c0-3.3 3-5.5 7-5.5s7 2.2 7 5.5", // + head circle below
  logout: "M14 5h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4M10 12h9M16 9l3 3-3 3",
  protein: "M7 9V6m10 3V6M7 18v3m10-3v3M7 9h10M7 12.5h10",
  calendar: "M5 7h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM4 11.5h16M9 4v3M15 4v3",
  bulb: "M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 1.9V16h5.2v-.2c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3Z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4",
  barcode: "M4 6v12M7 6v12M10 6v9M13 6v12M16 6v9M19 6v12",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM4 12c0-.6 0-1 .1-1.5l-1.8-1.4 2-3.4 2.1.9c.7-.5 1-.7 1.7-1L10.5 2h3l.4 2.2c.7.3 1 .5 1.7 1l2.1-.9 2 3.4-1.8 1.4c.1.5.1.9.1 1.5s0 1-.1 1.5l1.8 1.4-2 3.4-2.1-.9c-.7.5-1 .7-1.7 1L13.5 22h-3l-.4-2.2c-.7-.3-1-.5-1.7-1l-2.1.9-2-3.4 1.8-1.4C4 13 4 12.6 4 12Z",
  plusCircle: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8v8M8 12h8",
  close: "M6 6l12 12M18 6 6 18",
  closeCircle: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 11v5.5M12 7.8h0.01",
  chat: "M5 6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H10l-4 3v-3H6a1 1 0 0 1-1-1ZM9 10h0.01M12 10h0.01M15 10h0.01",
  phone: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM10.5 18.5h3",
  timer: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 9v4l2.5 2M9 2h6",
  stop: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9.5 9.5h5v5h-5Z",
  eyeoff: "M3 3l18 18M10.5 10.7a2 2 0 0 0 2.8 2.8M6.5 6.6C4.6 7.9 3 10 3 12c0 0 3 6 9 6 1.6 0 3-.4 4.2-1.1M9.5 5.2A9 9 0 0 1 12 5c6 0 9 6 9 6a16 16 0 0 1-2 2.8",
  nutrition: "M12 8c-2-3-8-2-8 4 0 6 5 10 8 10s8-4 8-10c0-6-6-7-8-4ZM12 8V4",
  camera: "M3 9a2 2 0 0 1 2-2h2l1.5-2h5L15 7h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9ZM12 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  gallery: "M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5ZM4 15l5-5 4 4 3-3 4 4M15 9a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z",
  pencil: "M4 20l4-1L20 7a1.4 1.4 0 0 0-2-2L6 17l-2 3Z",
  menu: "M4 8h16M4 12h16M4 16h16",
  merge: "M8 5H5v3M5 8v4a4 4 0 0 0 4 4h2m5-11h3v3m0 0v4a4 4 0 0 1-4 4h-2M12 16v3",
};

export function Icon({ name, size = 22, color = MINT.mintInk }: IconProps & { name: keyof typeof LINE_PATHS | string }) {
  const sw = 2.2;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === "clock" && <Circle cx={12} cy={13} r={8} stroke={color} strokeWidth={sw} />}
      {name === "person" && <Circle cx={12} cy={8} r={3.5} stroke={color} strokeWidth={sw} />}
      <Path
        d={LINE_PATHS[name] ?? ""}
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// ── 멀티컬러 / 채움 아이콘 ──────────────────────────────────
export const SparkIcon = ({ size = 15, color = MINT.yellow }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 3l2 5.5L19.5 10 14 12 12 17.5 10 12 4.5 10 10 8.5Z" fill={color} />
  </Svg>
);

export const BoltIcon = ({ size = 16, color = MINT.yellow }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M13 3L4 14h6l-1 7 9-11h-6l1-7Z" fill={color} />
  </Svg>
);

export const FlameIcon = ({ size = 16, color = MINT.pink }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 4c1.5 4 4.5 5 4.5 8.5a4.5 4.5 0 0 1-9 0c0-1.4.6-2.5 1.4-3.3-.2 1.6.6 2.6 1.6 2.6a1.8 1.8 0 0 0 1.6-2.6C11.7 8.7 12 6.5 12 4Z"
      fill={color}
    />
  </Svg>
);

export const CarbIcon = ({ size = 17 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 14h14l-1.5 6h-11Z" fill="#FFC078" />
    <Path d="M7 14c0-4 2-7 5-7s5 3 5 7" fill="none" stroke="#E6932F" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const FatIcon = ({ size = 17 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={9} cy={13} r={5} fill="#FF9DB0" />
    <Circle cx={15} cy={11} r={4} fill="#FFB6C4" />
  </Svg>
);

export const SaladIcon = ({ size = 30 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Path d="M5 17h22a11 11 0 0 1-22 0Z" fill="#6FD3B6" />
    <Path d="M5 17h22" stroke="#2E9E83" strokeWidth={2} strokeLinecap="round" />
    <Circle cx={13} cy={13} r={3.4} fill="#FF9DB0" />
    <Path d="M19 9c3-1 5 1 4 4-3 1-5-1-4-4Z" fill="#9BE3CE" />
    <Path d="M9 11c2-2 5-1 5-1s-1 3-3 3.5" fill="#FFD36E" />
  </Svg>
);

// 끼니 아이콘
export const MealSun = ({ size = 18 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={12} cy={13} r={4} fill="#FFD36E" />
    <G stroke="#E6932F" strokeWidth={2} strokeLinecap="round">
      <Path d="M12 4v2M5 13H3m18 0h-2M6 7 5 6m13 1 1-1" />
    </G>
    <Path d="M4 18h16" stroke="#FFC078" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
export const MealLunch = ({ size = 18 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={5} fill="#FFD36E" />
    <G stroke="#E6932F" strokeWidth={2} strokeLinecap="round">
      <Path d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6 5 5M18 6l1-1M6 18l-1 1M18 18l1 1" />
    </G>
  </Svg>
);
export const MealMoon = ({ size = 18 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M16 4a8 8 0 1 0 4 12 7 7 0 0 1-4-12Z" fill="#8FC7F5" />
  </Svg>
);
export const MealSnack = ({ size = 18 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={12} cy={13} r={7} fill="#FF9DB0" />
    <Circle cx={10} cy={11} r={1} fill="#fff" />
    <Circle cx={14} cy={14} r={1} fill="#fff" />
    <Circle cx={13} cy={10} r={1} fill="#fff" />
    <Path d="M12 6c0-2 2-2 3-3" stroke="#9BE3CE" strokeWidth={2} fill="none" strokeLinecap="round" />
  </Svg>
);

// 아바타 얼굴 (헤더) — 보통 mint 배경 위에 흰색으로
export const FaceAvatar = ({ size = 30, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Circle cx={11.5} cy={14} r={2.1} fill={color} />
    <Circle cx={20.5} cy={14} r={2.1} fill={color} />
    <Circle cx={11} cy={19} r={2} fill={color} opacity={0.55} />
    <Circle cx={21} cy={19} r={2} fill={color} opacity={0.55} />
    <Path d="M12 21q4 3.5 8 0" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
  </Svg>
);

// 물방울 마스코트 (얼굴 있는)
export const WaterMascot = ({ size = 56 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 56 56">
    <Path d="M28 5C28 5 12 22 12 35a16 16 0 0 0 32 0C44 22 28 5 28 5Z" fill="#8FC7F5" />
    <Path d="M22 30c-2 2-2.5 5-1 7" stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.7} />
    <Circle cx={23} cy={36} r={2.4} fill="#fff" />
    <Circle cx={33} cy={36} r={2.4} fill="#fff" />
    <Circle cx={23} cy={37} r={1.1} fill="#3F8DD6" />
    <Circle cx={33} cy={37} r={1.1} fill="#3F8DD6" />
    <Circle cx={19.5} cy={40} r={2} fill="#fff" opacity={0.5} />
    <Circle cx={36.5} cy={40} r={2} fill="#fff" opacity={0.5} />
    <Path d="M25 41q3 2.5 6 0" stroke="#3F8DD6" strokeWidth={1.8} fill="none" strokeLinecap="round" />
  </Svg>
);

// 물방울 컵 (채움/빈)
export const WaterDrop = ({ size = 22, filled = true }: IconProps & { filled?: boolean }) =>
  filled ? (
    <Svg width={size} height={size * 1.18} viewBox="0 0 24 28">
      <Path d="M12 3C12 3 4 13 4 19a8 8 0 0 0 16 0C20 13 12 3 12 3Z" fill="#8FC7F5" />
      <Ellipse cx={9} cy={17} rx={1.6} ry={2.4} fill="#fff" opacity={0.6} />
    </Svg>
  ) : (
    <Svg width={size} height={size * 1.18} viewBox="0 0 24 28">
      <Path d="M12 3C12 3 4 13 4 19a8 8 0 0 0 16 0C20 13 12 3 12 3Z" fill="none" stroke="#CFE3F6" strokeWidth={2} />
    </Svg>
  );

export const BowlMascot = ({ size = 56 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Path d="M10 30h44a22 22 0 0 1-44 0Z" fill="#6FD3B6" />
    <Path d="M8 30h48" stroke="#2E9E83" strokeWidth={3} strokeLinecap="round" />
    <Path d="M22 22c2-3 6-3 8 0M34 19c2-2 6-2 8 1" stroke="#9BE3CE" strokeWidth={3} strokeLinecap="round" fill="none" />
    <Circle cx={26} cy={40} r={2.4} fill="#fff" />
    <Circle cx={38} cy={40} r={2.4} fill="#fff" />
    <Path d="M28 45q4 3 8 0" stroke="#fff" strokeWidth={2.2} fill="none" strokeLinecap="round" />
  </Svg>
);

export const EmptyMascot = ({ size = 56, color = "#B4CFC5" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Circle cx={32} cy={32} r={22} fill="none" stroke={color} strokeWidth={3} />
    <Circle cx={24} cy={29} r={2.6} fill={color} />
    <Circle cx={40} cy={29} r={2.6} fill={color} />
    <Path d="M25 41q7 -5 14 0" stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" />
  </Svg>
);

export const LogoMark = ({ size = 88 }: { size?: number }) => {
  const r = size * 0.34;
  return (
    <Svg width={size} height={size} viewBox="0 0 88 88">
      <Path
        d={`M${r} 4h${88 - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${88 - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${88 - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${88 - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}Z`}
        fill="#6FD3B6"
      />
      <Path
        d="M30 34v20M24 39v10M58 34v20M64 39v10M30 44h28"
        stroke="#fff"
        strokeWidth={5}
        strokeLinecap="round"
      />
    </Svg>
  );
};

export const PlayIcon = ({ size = 18, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M8 5l12 7-12 7Z" fill={color} />
  </Svg>
);

export const HeartIcon = ({ size = 20, filled = true, color }: IconProps & { filled?: boolean }) =>
  filled ? (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 20S4 14.5 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5.5-8 11-8 11Z" fill={color ?? "#FF9DB0"} />
    </Svg>
  ) : (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20S4 14.5 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5.5-8 11-8 11Z"
        stroke={color ?? "#B4CFC5"}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );

export const GoalIcon = ({ goal, size = 24 }: { goal: string; size?: number }) => {
  switch (goal) {
    case "체중감량":
      return <FlameIcon size={size} color="#FF9DB0" />;
    case "근육증가":
      return <Icon name="dumbbell" size={size} color="#E6932F" />;
    case "체력유지":
      return <BoltIcon size={size} color="#FFD36E" />;
    case "건강관리":
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 8c-2-3-8-2-8 4 0 6 5 10 8 10s8-4 8-10c0-6-6-7-8-4ZM12 8V4"
            stroke="#2E9E83"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M9 12l2 2 4-4"
            stroke="#2E9E83"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
  }
};

export default Icon;
