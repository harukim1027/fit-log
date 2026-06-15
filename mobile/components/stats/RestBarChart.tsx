/**
 * @file components/stats/RestBarChart.tsx
 * @description 쉬는날(Rest Day)을 구분해 표시하는 막대 차트 (react-native-svg)
 *
 * react-native-chart-kit의 BarChart는 막대마다 다른 채움(패턴)을 줄 수 없어,
 * 쉬는날을 체크무늬로 표시하기 위해 SVG로 직접 그린다.
 *
 * 막대 종류:
 * - workout: 실제 값에 비례한 색 막대
 * - rest:    값은 0이지만 "쉬었다"는 의미로 체크무늬 패턴 막대(고정 높이)
 * - empty:   기록도 쉬는날 지정도 없는 날 — 바닥에 작은 흔적만
 */

import React from "react";
import Svg, {
  Defs,
  Pattern,
  Rect,
  Path,
  Line,
  Text as SvgText,
} from "react-native-svg";
import type { ThemeColors } from "../../constants/colors";

export type BarType = "workout" | "rest" | "empty";

export interface BarDatum {
  label: string;
  value: number;
  type: BarType;
  /** workout 막대 개별 색 (루틴 색). 없으면 props.color 사용 */
  color?: string;
}

interface Props {
  data: BarDatum[];
  /** workout 막대 채움 색 (hex 또는 rgba 문자열) */
  color: string;
  width: number;
  height?: number;
  /** 값 라벨 접미사 (예: "kg", "kcal") */
  suffix?: string;
  c: ThemeColors;
  /** 같은 화면에 차트가 둘 이상일 때 패턴 id 충돌을 막기 위한 식별자 */
  patternId?: string;
}

export function RestBarChart({
  data,
  color,
  width,
  height = 160,
  suffix = "",
  c,
  patternId = "restPattern",
}: Props) {
  const labelH = 22; // 하단 요일 라벨 영역
  const topPad = 16; // 상단 값 라벨 영역
  const baseline = height - labelH;
  const chartH = baseline - topPad;

  const n = data.length || 1;
  const slot = width / n;
  const barW = Math.min(26, slot * 0.52);

  // workout 막대만 실제 값으로 스케일링 (rest는 고정 높이)
  const max = Math.max(1, ...data.map((d) => (d.type === "workout" ? d.value : 0)));
  const restH = chartH * 0.42;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <Pattern
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={6}
          height={6}>
          <Rect width={6} height={6} fill={c.surfaceAlt} />
          <Path d="M0,6 L6,0" stroke={c.textMuted} strokeWidth={1} />
          <Path d="M-1.5,1.5 L1.5,-1.5" stroke={c.textMuted} strokeWidth={1} />
          <Path d="M4.5,7.5 L7.5,4.5" stroke={c.textMuted} strokeWidth={1} />
        </Pattern>
      </Defs>

      {/* 바닥선 */}
      <Line
        x1={0}
        y1={baseline}
        x2={width}
        y2={baseline}
        stroke={c.border}
        strokeWidth={1}
      />

      {data.map((d, i) => {
        const cx = slot * i + slot / 2;
        const x = cx - barW / 2;
        const labelY = height - 6;

        if (d.type === "rest") {
          const y = baseline - restH;
          return (
            <React.Fragment key={i}>
              <Rect
                x={x}
                y={y}
                width={barW}
                height={restH}
                rx={5}
                fill={`url(#${patternId})`}
                stroke={c.border}
                strokeWidth={1}
              />
              <SvgText
                x={cx}
                y={labelY}
                fontSize={11}
                fontWeight="600"
                fill={c.textMuted}
                textAnchor="middle">
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        }

        if (d.type === "empty") {
          return (
            <React.Fragment key={i}>
              <Rect
                x={x}
                y={baseline - 3}
                width={barW}
                height={3}
                rx={1.5}
                fill={c.surfaceAlt}
              />
              <SvgText
                x={cx}
                y={labelY}
                fontSize={11}
                fontWeight="600"
                fill={c.textMuted}
                textAnchor="middle">
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        }

        // workout
        const barH = Math.max(4, (d.value / max) * chartH);
        const y = baseline - barH;
        return (
          <React.Fragment key={i}>
            <Rect x={x} y={y} width={barW} height={barH} rx={5} fill={d.color ?? color} />
            <SvgText
              x={cx}
              y={y - 4}
              fontSize={9}
              fontWeight="700"
              fill={c.textSecondary}
              textAnchor="middle">
              {Math.round(d.value).toLocaleString()}
              {suffix}
            </SvgText>
            <SvgText
              x={cx}
              y={labelY}
              fontSize={11}
              fontWeight="600"
              fill={c.textSecondary}
              textAnchor="middle">
              {d.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

/** 차트 범례: ■ 운동  ▦ 쉬는날  □ 미수행 (SVG 스와치 + 라벨) */
export function RestBarLegend({
  color,
  c,
}: {
  color: string;
  c: ThemeColors;
}) {
  const items: { fill: string; label: string; pattern?: boolean }[] = [
    { fill: color, label: "운동" },
    { fill: c.surfaceAlt, label: "쉬는날", pattern: true },
    { fill: c.surfaceAlt, label: "미수행" },
  ];
  return (
    <Svg width={220} height={20}>
      <Defs>
        <Pattern
          id="legendRest"
          patternUnits="userSpaceOnUse"
          width={6}
          height={6}>
          <Rect width={6} height={6} fill={c.surfaceAlt} />
          <Path d="M0,6 L6,0" stroke={c.textMuted} strokeWidth={1} />
        </Pattern>
      </Defs>
      {items.map((it, i) => {
        const x = i * 74;
        return (
          <React.Fragment key={i}>
            <Rect
              x={x}
              y={4}
              width={12}
              height={12}
              rx={3}
              fill={it.pattern ? "url(#legendRest)" : it.fill}
              stroke={c.border}
              strokeWidth={it.pattern || it.label === "미수행" ? 1 : 0}
            />
            <SvgText
              x={x + 17}
              y={14}
              fontSize={11}
              fontWeight="600"
              fill={c.textSecondary}>
              {it.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}
