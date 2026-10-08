/**
 * @file app/routine/_layout.tsx
 * @description 루틴 관리 중첩 스택.
 *
 * ── 왜 중첩 스택인가 ──────────────────────────────────────────────────────
 * 전에는 `modal/routine-manage.tsx` 하나가 mode·subMode 상태머신으로 다섯
 * 화면을 그렸다. 그래서 **모드 전환과 뒤로가기가 어긋났다** — 종목 추가 중
 * 스와이프하면 "종목 추가 취소"가 아니라 "루틴 관리 전체 닫기"가 됐고,
 * 그걸 막으려고 그 상태에서만 `gestureEnabled: false` 를 걸어 두었다.
 *
 * 모드를 **스택 깊이와 1:1** 로 놓으면 그 절충이 필요 없다. 뒤로가기·스와이프·
 * 헤더 닫기가 전부 "한 단계 취소"라는 같은 뜻이 된다.
 *
 *   index          목록
 *   edit           작성·편집        ?id=
 *   exercise       종목 추가·편집    ?index=
 *   combine/index  합칠 루틴 선택
 *   combine/edit   합쳐진 종목 정리
 *
 * ── presentation ─────────────────────────────────────────────────────────
 * 여기서 정하지 않는다 = **기본값 `card`** 다. 루트 스택이 이 그룹에 준 것과
 * 같다(`app/_layout.tsx` 의 `routine` 스크린).
 *
 * card 를 쓰는 이유는 이 화면들이 전부 "이어지는 단계"이기 때문이다.
 * 오른쪽에서 들어오고 스와이프로 되돌아간다. `fullScreenModal` 은 "잠깐
 * 덮었다 사라지는" 성격이라(barcode-scan·full-calendar) 여기 맞지 않는다.
 *
 * **스와이프도 `usePreventRemove` 를 거친다.** react-native-screens 가
 * `preventNativeDismiss` 로 네이티브 전환을 취소하고
 * `onNativeDismissCancelled` → `navigation.dispatch(StackActions.pop)` 으로
 * JS 에 되돌려주기 때문이다. 그래서 각 단계의 미저장 가드가 스와이프에도 걸린다.
 * (안드로이드는 native-stack 이 gestureEnabled 를 강제로 false 로 넘기고
 *  시스템 백 제스처를 JS 에서 처리한다.)
 */
import { Stack } from "expo-router";
import { useColors } from "../../constants/colors";

export default function RoutineLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.background },
        animation: "slide_from_right",
      }}
    />
  );
}
