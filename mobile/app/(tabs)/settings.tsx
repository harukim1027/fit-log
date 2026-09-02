/**
 * @file app/(tabs)/settings.tsx
 * @description 설정 탭 — 앱 설정과 계정을 한곳에 모은다.
 *
 * ── 왜 프로필 필드가 여기 없는가 ───────────────────────────────────────────
 * 이름·성별·나이·신장·체중·목표·주간 운동 목표 7필드는 `edit-profile`에 그대로
 * 두고 링크만 놓는다. 성격이 다르기 때문이다 — 그쪽은 **"저장하기"를 눌러야
 * 반영되는 폼**이고 미저장 이탈 가드가 걸려 있다. 이 화면의 항목은 전부
 * **누르는 즉시 반영**된다. 둘을 한 화면에 섞으면 "저장을 눌러야 하는 것과
 * 아닌 것"이 구분되지 않는다.
 *
 * 같은 이유로 `edit-profile`에 있던 "앱 설정" 구획 3개(무게 단위·부위 선택기·
 * 휴식 알림)를 이쪽으로 옮겼다. 그 셋만 즉시 반영이라 폼 안에서 겉돌았다.
 */
import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Header, Section, Card } from "../../design-system";
import { Icon } from "../../components/AppIcons";
import { useColors } from "../../constants/colors";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useThemeStore } from "../../store/themeStore";
import { showCuteAlert } from "../../components/CuteAlert";
import { ErrorBoundary } from "../../components/ErrorBoundary";

// edit-profile에서 그대로 가져온다. 노브는 off일 때 트랙(surfaceAlt)과 명도 차가
// 1.12뿐이라 그림자가 유일한 경계였다. 다크에서는 그 그림자가 안 보이므로
// 보더로 대체한다. on일 때는 트랙이 primary라 배경 대비만으로 충분하다.
const LIGHT_KNOB_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 3,
  elevation: 2,
};

function SettingsScreen() {
  const c = useColors();
  const router = useRouter();
  const isDark = useThemeStore((s) => s.mode) === "dark";
  const { mode, toggle } = useThemeStore();
  const { user, logout } = useAuthStore();
  const {
    weightUnit,
    showBodypartSelector,
    notifyBeforeRestEnd,
    loadSettings,
    setWeightUnit,
    setShowBodypartSelector,
    setNotifyBeforeRestEnd,
  } = useSettingsStore();

  React.useEffect(() => {
    loadSettings();
  }, []);

  /**
   * 확인 팝업의 형태는 `stats.tsx`에 있던 것을 그대로 옮겼다.
   * 새 패턴을 만들지 않는다 — danger 톤 + [취소 soft, 로그아웃 primary].
   */
  const handleLogout = () => {
    showCuteAlert({
      icon: "alert",
      tone: "danger",
      title: "로그아웃",
      message: "정말 로그아웃 하시겠어요?",
      buttons: [
        { label: "취소", style: "soft" },
        {
          label: "로그아웃",
          style: "primary",
          onPress: async () => {
            try {
              await logout();
              router.replace("/auth/login" as any);
            } catch {
              showCuteAlert({
                icon: "alert",
                tone: "danger",
                title: "오류",
                message: "로그아웃에 실패했어요. 다시 시도해 주세요.",
                buttons: [{ label: "확인", style: "primary" }],
              });
            }
          },
        },
      ],
    });
  };

  /** 항목 한 줄. 좌측 아이콘 + 라벨(+ 설명), 우측 컨트롤. */
  const Row = ({
    icon,
    label,
    description,
    right,
  }: {
    icon: string;
    label: string;
    description?: string;
    right: React.ReactNode;
  }) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        gap: 12,
      }}>
      {/* 좌측은 남는 폭을 먹고, 우측이 길면(이메일 등) 우측이 줄어든다.
          flexShrink 를 안 주면 긴 값이 라벨을 밀어내 320 폭에서 겹친다. */}
      <View style={{ flexShrink: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name={icon} size={16} color={c.textSecondary} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: c.textPrimary }}>
            {label}
          </Text>
        </View>
        {description ? (
          <Text
            style={{
              fontSize: 12,
              color: c.textSecondary,
              marginTop: 2,
              marginLeft: 24,
            }}>
            {description}
          </Text>
        ) : null}
      </View>
      <View style={{ flexShrink: 1, alignItems: "flex-end" }}>{right}</View>
    </View>
  );

  /** on/off 토글. edit-profile의 것과 같은 치수·같은 노브 처리다. */
  const Toggle = ({ on, onPress }: { on: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={{
        width: 46,
        height: 26,
        borderRadius: 13,
        backgroundColor: on ? c.primary : c.surfaceAlt,
        justifyContent: "center",
        paddingHorizontal: 2,
      }}
      onPress={onPress}
      activeOpacity={0.7}>
      <View
        style={[
          {
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: c.surface,
            transform: [{ translateX: on ? 20 : 0 }],
          },
          isDark
            ? !on && { borderWidth: 1, borderColor: c.border }
            : LIGHT_KNOB_SHADOW,
        ]}
      />
    </TouchableOpacity>
  );

  /** 두 갈래 세그먼트(kg/lbs, 다크/라이트). 알약 칩 두 개다. */
  const Segment = <T extends string>({
    options,
    value,
    onSelect,
  }: {
    options: readonly T[];
    value: T;
    onSelect: (v: T) => void;
  }) => (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {options.map((o) => (
        <TouchableOpacity
          key={o}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ selected: value === o }}
          style={{
            minHeight: 34,
            justifyContent: "center",
            paddingHorizontal: 14,
            borderRadius: 999,
            backgroundColor: value === o ? c.primary : c.surfaceAlt,
          }}
          onPress={() => onSelect(o)}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: value === o ? c.onAccent : c.textSecondary,
            }}>
            {o}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Header title="설정" />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 40,
          gap: 20,
        }}>
        {/* 프로필 — 링크만. 실제 편집은 edit-profile 이 한다. */}
        <Card
          onPress={() => router.push("/modal/edit-profile" as any)}
          accessibilityLabel="프로필 편집">
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                backgroundColor: c.primary,
                alignItems: "center",
                justifyContent: "center",
              }}>
              <Icon name="person" size={22} color={c.onAccent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 16, fontWeight: "800", color: c.textPrimary }}
                numberOfLines={1}>
                {user?.name ?? "이름 없음"}
              </Text>
              <Text
                style={{ fontSize: 12, color: c.textSecondary, marginTop: 2 }}
                numberOfLines={1}>
                {user?.email ?? ""}
              </Text>
            </View>
            <Icon name="chevronRight" size={18} color={c.textMuted} />
          </View>
        </Card>

        <Section>
          <Section.Title>화면</Section.Title>
          <Section.Content>
            <Card>
              <Row
                icon="bulb"
                label="테마"
                right={
                  <Segment
                    options={["다크", "라이트"] as const}
                    value={mode === "dark" ? "다크" : "라이트"}
                    // themeStore 는 toggle 하나만 노출한다. 지금과 다른 쪽을
                    // 고른 경우에만 뒤집는다.
                    onSelect={(v) => {
                      const next = v === "다크" ? "dark" : "light";
                      if (next !== mode) toggle();
                    }}
                  />
                }
              />
              <Row
                icon="dumbbell"
                label="무게 단위"
                right={
                  <Segment
                    options={["kg", "lbs"] as const}
                    value={weightUnit}
                    onSelect={setWeightUnit}
                  />
                }
              />
              <Row
                icon="target"
                label="운동 추가 시 부위 선택 표시"
                right={
                  <Toggle
                    on={showBodypartSelector}
                    onPress={() => setShowBodypartSelector(!showBodypartSelector)}
                  />
                }
              />
            </Card>
          </Section.Content>
        </Section>

        <Section>
          <Section.Title>알림</Section.Title>
          <Section.Content>
            <Card>
              <Row
                icon="timer"
                label="휴식 30초 전 알림"
                description="휴식 종료 30초 전에 미리 알려드려요"
                right={
                  <Toggle
                    on={notifyBeforeRestEnd}
                    onPress={() => setNotifyBeforeRestEnd(!notifyBeforeRestEnd)}
                  />
                }
              />
            </Card>
          </Section.Content>
        </Section>

        <Section>
          <Section.Title>계정</Section.Title>
          <Section.Content>
            <Card>
              <Row
                icon="person"
                label="이메일"
                right={
                  <Text
                    style={{ fontSize: 14, color: c.textSecondary, textAlign: "right" }}
                    numberOfLines={1}>
                    {user?.email ?? "-"}
                  </Text>
                }
              />
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="로그아웃"
                onPress={handleLogout}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 44,
                }}>
                <Icon name="logout" size={16} color={c.danger} />
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: c.danger }}>
                  로그아웃
                </Text>
              </TouchableOpacity>
            </Card>
          </Section.Content>
        </Section>
      </ScrollView>
    </View>
  );
}

export default function SettingsScreenRoute() {
  return (
    <ErrorBoundary screenName="설정">
      <SettingsScreen />
    </ErrorBoundary>
  );
}
