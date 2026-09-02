/**
 * @file hooks/useUnsavedGuard.ts
 * @description 작성 중인 내용이 있을 때 이탈을 한 번 되묻는다.
 *
 * ── 왜 proceed를 인자로 받는가 ─────────────────────────────────────────────
 * "이탈"이 화면마다 다른 동작이기 때문이다. 라우트를 벗어나는 곳도 있고
 * (`goBack()`), 같은 라우트 안에서 모드만 되돌리는 곳도 있다
 * (`setMode("list")`, `setEditMode(false)`). 훅이 이탈까지 수행하면 그 셋을
 * 담을 수 없다. 훅은 "물어볼지 말지"만 정하고 실제 이탈은 호출부가 넘긴다.
 *
 * ── 판정을 훅이 하지 않는 이유 ─────────────────────────────────────────────
 * dirty 판정은 화면마다 필드가 달라 공통화되지 않는다. 빈 화면으로 열리는
 * 곳은 "값이 있는가"로 충분하지만, 기존 값이 채워진 채 열리는 곳
 * (`edit-profile`, routine-manage의 edit, `ExerciseAdder`의 editMode,
 *  히스토리 편집)은 **초기 스냅샷 대비 변경**을 봐야 한다. 그쪽에서
 *  "값이 있는가"로 판정하면 열자마자 dirty가 되어 아무것도 안 고치고 닫아도
 *  확인창이 뜬다.
 *
 * ── 강제할 수 없다 ─────────────────────────────────────────────────────────
 * 이탈 경로가 `router.back()` 한 종류가 아니라 `useGoBack`처럼 타입으로
 * 강제할 수 없다. 새 화면을 추가할 때는 수동으로 붙여야 한다.
 * 라우트 화면이라면 `usePreventRemove`도 함께 걸어야 안드로이드 하드웨어
 * 뒤로가기가 새지 않는다 — 그쪽은 버튼 핸들러를 거치지 않는다.
 */
import { useCallback } from "react";
import { showCuteAlert } from "../components/CuteAlert";

export function useUnsavedGuard(isDirty: boolean) {
  return useCallback(
    (proceed: () => void) => {
      if (!isDirty) {
        proceed();
        return;
      }
      // 형태는 기구 설정 시트가 쓴 것과 같다(ExerciseAdder의 닫기 확인).
      // 파괴적 액션이므로 danger 톤이고, 기본 선택은 "계속 작성"이 아니라
      // 오른쪽 primary가 "닫기"다 — 앱의 다른 확인창과 버튼 순서를 맞춘다.
      showCuteAlert({
        icon: "alert",
        tone: "danger",
        title: "작성 중인 내용이 있어요",
        message: "닫으면 입력한 내용이 사라져요.",
        buttons: [
          { label: "계속 작성", style: "soft" },
          { label: "닫기", style: "primary", onPress: proceed },
        ],
      });
    },
    [isDirty],
  );
}
