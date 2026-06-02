// ============================================================
// CuteAlert.tsx — 손그림 아이콘 알럿 (캐릭터 없는 버전, Alert.alert 대체)
// react-native + react-native-svg
//
// 사용 — 명령형 헬퍼(권장):
//   import { showCuteAlert } from "@/components/CuteAlert";
//   showCuteAlert({ preset: 'loginFail' });
//   showCuteAlert({ preset: 'signupSuccess', onPrimary: () => router.replace('/onboarding') });
//   showCuteAlert({ icon:'pencil', tone:'info', title:'아직 비어 있어요', message:'…', buttons:[{label:'알겠어요'}] });
//
// 루트(app/_layout.tsx)에 <CuteAlertHost/> 를 한 번 마운트해야 함.
// ============================================================
import React, { useEffect, useRef, useState } from "react";
import { Text, Pressable, Modal, Animated, StyleSheet, View } from "react-native";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useColors } from "../constants/colors";

type IconKey = "lock" | "mail" | "pencil" | "wifi" | "check" | "alert" | "trash";
type Tone = "danger" | "warn" | "info" | "muted" | "ok";
type Btn = { label: string; style?: "primary" | "soft"; onPress?: () => void };
type AlertOpts = { icon: IconKey; tone: Tone; title: string; message?: string; buttons?: Btn[]; shake?: boolean };

// ── 손그림 라인 아이콘 ──
function Icon({ name, color, size = 34 }: { name: IconKey; color: string; size?: number }) {
  const p = { stroke: color, strokeWidth: 2.2, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "lock" && (<><Rect x={5} y={11} width={14} height={9} rx={2.5} {...p} /><Path d="M8 11V8a4 4 0 0 1 8 0v3" {...p} /><Circle cx={12} cy={15.5} r={1.3} fill={color} /></>)}
      {name === "mail" && (<><Rect x={3} y={5} width={18} height={14} rx={3} {...p} /><Path d="M4 7l8 6 8-6" {...p} /></>)}
      {name === "pencil" && (<><Path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3Z" {...p} /><Path d="M14 7l3 3" {...p} /></>)}
      {name === "wifi" && (<><Path d="M5 12.5a10 10 0 0 1 14 0M8 16a5 5 0 0 1 8 0" {...p} /><Circle cx={12} cy={19.5} r={1.2} fill={color} /><Path d="M3 4l18 16" {...p} /></>)}
      {name === "check" && (<Path d="M5 13l4 4L19 7" {...p} strokeWidth={2.6} />)}
      {name === "alert" && (<><Path d="M12 4 3 20h18L12 4Z" {...p} /><Path d="M12 10v4M12 17h.01" {...p} /></>)}
      {name === "trash" && (<><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" {...p} /><Path d="M10 11v6M14 11v6" {...p} /></>)}
    </Svg>
  );
}

// ── 프리셋 ──
type Preset = "loginFail" | "emailDup" | "emptyInput" | "network" | "signupSuccess";
const PRESETS: Record<Preset, Omit<AlertOpts, "buttons"> & { _btns: (cb: any) => Btn[] }> = {
  loginFail:     { icon: "lock",   tone: "danger", title: "비밀번호가 달라요", message: "이메일 또는 비밀번호를\n다시 확인해 주세요.", shake: true, _btns: (cb) => [{ label: "다시 입력", style: "primary", onPress: cb.onPrimary }] },
  emailDup:      { icon: "mail",   tone: "warn",   title: "이미 가입된 이메일이에요", message: "이 이메일로 로그인하거나\n다른 이메일로 가입해 주세요.", _btns: (cb) => [{ label: "로그인", style: "soft", onPress: cb.onSecondary }, { label: "다른 이메일", style: "primary", onPress: cb.onPrimary }] },
  emptyInput:    { icon: "pencil", tone: "info",   title: "아직 비어 있어요", message: "이메일과 비밀번호를\n모두 입력해 주세요.", _btns: (cb) => [{ label: "알겠어요", style: "primary", onPress: cb.onPrimary }] },
  network:       { icon: "wifi",   tone: "muted",  title: "연결이 느려요", message: "네트워크 상태를 확인하고\n다시 시도해 주세요.", _btns: (cb) => [{ label: "취소", style: "soft", onPress: cb.onSecondary }, { label: "다시 시도", style: "primary", onPress: cb.onPrimary }] },
  signupSuccess: { icon: "check",  tone: "ok",     title: "환영해요! 🎉", message: "가입이 완료됐어요.\n첫 운동을 시작해볼까요?", _btns: (cb) => [{ label: "시작하기", style: "primary", onPress: cb.onPrimary }] },
};

let _open: ((o: AlertOpts) => void) | null = null;
export function showCuteAlert(
  opts: AlertOpts | { preset: Preset; onPrimary?: () => void; onSecondary?: () => void; title?: string; message?: string }
) {
  if (!_open) { console.warn("CuteAlertHost 가 마운트되지 않았어요"); return; }
  if ("preset" in opts && opts.preset) {
    const p = PRESETS[opts.preset];
    _open({ icon: p.icon, tone: p.tone, title: opts.title ?? p.title, message: opts.message ?? p.message, shake: p.shake, buttons: p._btns({ onPrimary: opts.onPrimary, onSecondary: opts.onSecondary }) });
  } else { _open(opts as AlertOpts); }
}

const TONE_KEY: Record<Tone, string> = { danger: "danger", warn: "warning", info: "primary", muted: "textMuted", ok: "success" };

export function CuteAlertHost() {
  const c = useColors() as any;
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<AlertOpts | null>(null);
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => { _open = (o) => { setOpts(o); setVisible(true); }; return () => { _open = null; }; }, []);

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.85); opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    if (opts?.shake) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([-6, 6, -5, 5, 0].map((v) => Animated.timing(shakeX, { toValue: v, duration: 50, useNativeDriver: true }))).start();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [visible, opts]);

  const close = (cb?: () => void) => {
    Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => { setVisible(false); cb?.(); });
  };

  if (!opts) return null;
  const col = c[TONE_KEY[opts.tone]] ?? c.primary;
  const btns = opts.buttons ?? [{ label: "확인", style: "primary" as const }];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={() => close()}>
      <Animated.View style={[s.scrim, { opacity }]}>
        <Animated.View style={[s.card, { backgroundColor: c.surface, borderColor: c.border, transform: [{ scale }, { translateX: shakeX }] }]}>
          <View style={[s.iconring, { backgroundColor: col + "22" }]}>
            <Icon name={opts.icon} color={col} size={opts.icon === "check" ? 28 : 26} />
          </View>
          <Text style={[s.title, { color: c.textPrimary }]}>{opts.title}</Text>
          {!!opts.message && <Text style={[s.msg, { color: c.textSecondary }]}>{opts.message}</Text>}
          <View style={s.btns}>
            {btns.map((b, i) => {
              const bg = b.style === "soft" ? c.surfaceAlt : c.primary;
              const fg = b.style === "soft" ? c.textPrimary : "#fff";
              return (
                <Pressable key={i} style={[s.btn, { backgroundColor: bg }]} onPress={() => close(b.onPress)}>
                  <Text style={[s.btnT, { color: fg }]}>{b.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(5,9,14,0.55)", alignItems: "center", justifyContent: "center", padding: 28 },
  card: { width: 300, borderWidth: 1, borderRadius: 24, paddingTop: 24, paddingHorizontal: 18, paddingBottom: 18, alignItems: "center" },
  iconring: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  title: { fontSize: 17, fontWeight: "900", textAlign: "center" },
  msg: { fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 21, marginTop: 6 },
  btns: { flexDirection: "row", gap: 8, width: "100%", marginTop: 14 },
  btn: { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnT: { fontSize: 15, fontWeight: "800" },
});

export default CuteAlertHost;
