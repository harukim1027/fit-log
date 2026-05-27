import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Body, { ExtendedBodyPart, Slug } from 'react-native-body-highlighter';
import { Colors } from '../constants/colors';

// ── Labels (Korean) ─────────────────────────────────────────
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

// ── Design tokens ───────────────────────────────────────────
const HIGHLIGHT = '#FF8C7A';
const HIGHLIGHT_BG = '#FF8C7A28';
const BODY_FILL   = '#EDE8F8';   // inactive muscle fill
const BODY_BORDER = Colors.textMuted;

const CARD_SHADOW = {
  shadowColor: '#B4A0D8', shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
};

// ── Component ───────────────────────────────────────────────
interface Props {
  muscles: string[];
  /** Scale factor — Body base is 200 × 400 px */
  scale?: number;
}

export default function MuscleMap({ muscles, scale = 0.62 }: Props) {
  const [side, setSide] = useState<'front' | 'back'>('front');

  const data: ExtendedBodyPart[] = muscles.map(slug => ({
    slug: slug as Slug,
    color: HIGHLIGHT,
    intensity: 1,
  }));

  return (
    <View style={st.row}>
      {/* Body SVG */}
      <Body
        data={data}
        side={side}
        scale={scale}
        colors={[HIGHLIGHT]}
        defaultFill={BODY_FILL}
        border={BODY_BORDER}
      />

      {/* Right panel */}
      <View style={st.panel}>
        {/* Front / Back toggle */}
        <View style={st.tabRow}>
          {(['front', 'back'] as const).map(v => (
            <TouchableOpacity
              key={v}
              style={[st.tab, side === v && st.tabActive]}
              onPress={() => setSide(v)}
            >
              <Text style={[st.tabText, side === v && st.tabTextActive]}>
                {v === 'front' ? '앞면' : '뒷면'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Muscle tags */}
        <Text style={st.panelLabel}>자극 근육</Text>
        <View style={st.tagsWrap}>
          {muscles.map(m => (
            <View key={m} style={st.tag}>
              <Text style={st.tagText}>
                {MUSCLE_LABELS[m as Slug] ?? m}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },

  // Right info panel
  panel: { flex: 1, paddingLeft: 12, paddingTop: 2 },
  tabRow: {
    flexDirection: 'row', backgroundColor: Colors.surfaceAlt,
    borderRadius: 10, padding: 3, marginBottom: 14, alignSelf: 'flex-start',
  },
  tab: { paddingHorizontal: 11, paddingVertical: 4, borderRadius: 8 },
  tabActive: { backgroundColor: Colors.surface, ...CARD_SHADOW },
  tabText: { fontSize: 11, fontWeight: '500', color: Colors.textMuted },
  tabTextActive: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary },
  panelLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8,
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: HIGHLIGHT_BG, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  tagText: { fontSize: 12, fontWeight: '700', color: HIGHLIGHT },
});
