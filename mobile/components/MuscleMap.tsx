import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Body, { ExtendedBodyPart, Slug } from 'react-native-body-highlighter';
import { useColors } from '../constants/colors';
import { useThemeStore } from '../store/themeStore';

// ── Labels (Korean) ─────────────────────────────────────────
/**
 * 홈 히어로와 통계 근육맵이 "골고루 했는가"를 셀 때 쓰는 주요 부위 6개.
 *
 * MUSCLE_LABELS 는 15개를 정의하지만 그중 여섯만 센다. 큰 근육군을 한 번씩
 * 돌았는지 보려는 지표라, 세부 부위까지 넣으면 분모가 커져 늘 미달로 보인다.
 * (선정 기준이 어디에도 없던 것을 이 주석으로 남긴다.)
 */
export const MAJOR_MUSCLES = ['chest', 'upper-back', 'deltoids', 'abs', 'quadriceps', 'gluteal'];

/**
 * 위 6개의 **짧은** 라벨. 칩과 힌트가 함께 쓴다.
 *
 * MUSCLE_LABELS 를 그대로 쓰지 않는 이유: 그쪽은 해부학 명칭이라
 * "등 상부·삼각근·대퇴사두"로 길다. 칩 6개를 한 줄에 넣으려면 짧아야 하고,
 * 칩이 "등"인데 힌트가 "등 상부는 아직이에요"라고 말하면 같은 것을 두 이름으로
 * 부르게 된다. 두 화면이 같은 맵을 보게 해서 그 어긋남을 구조적으로 막는다.
 */
export const MAJOR_MUSCLE_LABELS: Record<string, string> = {
  chest: '가슴',
  'upper-back': '등',
  deltoids: '어깨',
  abs: '복근',
  quadriceps: '하체',
  gluteal: '둔근',
};

export const MUSCLE_LABELS: Partial<Record<Slug, string>> = {
  chest: '가슴',
  biceps: '이두',
  triceps: '삼두',
  forearm: '전완',
  deltoids: '삼각근',
  abs: '복근',
  obliques: '복사근',
  trapezius: '승모근',
  'upper-back': '등 상부',
  'lower-back': '등 하부',
  adductors: '내전근',
  hamstring: '햄스트링',
  quadriceps: '대퇴사두',
  calves: '종아리',
  gluteal: '둔근',
};

// ── Category → muscle slugs fallback ───────────────────────
export const CATEGORY_TO_SLUGS: Partial<Record<string, Slug[]>> = {
  '가슴':  ['chest'],
  '등':    ['upper-back', 'lower-back', 'trapezius'],
  '어깨':  ['deltoids'],
  '팔':    ['biceps', 'triceps', 'forearm'],
  '하체':  ['quadriceps', 'hamstring', 'gluteal', 'calves'],
  '복근':  ['abs', 'obliques'],
};

// ── Exercise → muscle slugs mapping ────────────────────────
export const MUSCLE_MAP: Record<string, Slug[]> = {
  '벤치프레스':          ['chest', 'triceps', 'deltoids'],
  '인클라인 벤치프레스':  ['chest', 'deltoids', 'triceps'],
  '딥스':               ['chest', 'triceps'],
  '데드리프트':          ['upper-back', 'lower-back', 'hamstring', 'gluteal'],
  '바벨 로우':           ['upper-back', 'lower-back', 'biceps', 'trapezius'],
  '풀업':               ['upper-back', 'biceps', 'forearm'],
  '오버헤드프레스':       ['deltoids', 'triceps', 'trapezius'],
  '사이드 레터럴 레이즈':  ['deltoids'],
  '바벨 컬':            ['biceps', 'forearm'],
  '트라이셉스 익스텐션':   ['triceps'],
  '스쿼트':             ['quadriceps', 'hamstring', 'gluteal', 'calves'],
  '레그프레스':          ['quadriceps', 'hamstring', 'gluteal'],
  '런지':               ['quadriceps', 'hamstring', 'gluteal', 'calves'],
  '플랭크':             ['abs', 'obliques'],
  '크런치':             ['abs'],
};

// ── Component ───────────────────────────────────────────────
interface Props {
  muscles: string[];
  /** Scale factor — Body base is 200 × 400 px */
  scale?: number;
}

export default function MuscleMap({ muscles, scale = 0.62 }: Props) {
  const c = useColors();
  const isDark = useThemeStore((s) => s.mode) === 'dark';
  const [side, setSide] = useState<'front' | 'back'>('front');

  const HIGHLIGHT = c.primary;
  const HIGHLIGHT_BG = c.primary + '28';
  const BODY_FILL = isDark ? c.surfaceHigh : '#EDE8F8';

  const cardShadow = {
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  };

  const data: ExtendedBodyPart[] = muscles.map(slug => ({
    slug: slug as Slug,
    color: HIGHLIGHT,
    intensity: 1,
  }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {/* Body SVG */}
      <Body
        data={data}
        side={side}
        scale={scale}
        colors={[HIGHLIGHT]}
        defaultFill={BODY_FILL}
        border={c.textMuted}
      />

      {/* Right panel */}
      <View style={{ flex: 1, paddingLeft: 12, paddingTop: 2 }}>
        {/* Front / Back toggle */}
        <View style={{ flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: 10, padding: 3, marginBottom: 14, alignSelf: 'flex-start' }}>
          {(['front', 'back'] as const).map(v => (
            <TouchableOpacity activeOpacity={0.8}
              key={v}
              style={[
                { paddingHorizontal: 11, paddingVertical: 4, borderRadius: 8 },
                side === v ? { backgroundColor: c.surface, ...cardShadow } : undefined,
              ]}
              onPress={() => setSide(v)}
            >
              <Text style={[
                { fontSize: 11, fontWeight: '500', color: c.textMuted },
                side === v ? { fontWeight: '700', color: c.textPrimary } : undefined,
              ]}>
                {v === 'front' ? '앞면' : '뒷면'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Muscle tags */}
        <Text style={{ fontSize: 11, fontWeight: '700', color: c.textSecondary, marginBottom: 8 }}>자극 근육</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {muscles.map(m => (
            <View key={m} style={{ backgroundColor: HIGHLIGHT_BG, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: HIGHLIGHT }}>
                {MUSCLE_LABELS[m as Slug] ?? m}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
