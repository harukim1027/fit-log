/**
 * @file hooks/useGoBack.ts
 * @description 스택이 비어 있어도 반드시 화면을 벗어나는 "뒤로/닫기" 핸들러.
 *
 * ── 왜 필요한가 ────────────────────────────────────────────────────────────
 * expo-router의 `goBack()`은 스택이 비면 `GO_BACK` 액션을 조용히 버린다
 * (`expo-router/build/global-state/routing.js`의 `goBack()` → routingQueue).
 * **크래시가 아니라 무반응이 된다.** 모달이 화면을 덮고 있어 탭바도 가려지므로
 * 사용자가 빠져나갈 수단이 하나도 없다.
 *
 * 딥링크·푸시로 모달에 직접 진입하면 **반드시** 이 상황이 된다. 이 앱에는
 * `unstable_settings`/`initialRouteName`이 한 곳도 없고 `app/modal/_layout.tsx`도
 * 없어서, 모달 라우트가 루트 Stack에 평평하게 등록돼 있다. 즉 콜드 스타트로
 * `exp+fitlog://modal/add-food`를 열면 스택 항목이 그 화면 하나뿐이다.
 *
 * ── fallback이 필수 인자인 이유 ────────────────────────────────────────────
 * 옵셔널로 두면 빠뜨린 곳이 지금과 똑같이 무반응으로 남는다. 컴파일러가 막게
 * 한다 — IconButton이 `accessibilityLabel`을 타입 필수로 둔 것과 같은 방식이다.
 * "어디로 보낼 것인가"는 화면마다 다르고 컴포넌트가 정할 수 없으므로 기본값을
 * 주지 않는다.
 */
import { useCallback } from "react";
import { useRouter, type Href } from "expo-router";

export function useGoBack(fallback: Href) {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    // push가 아니라 replace다. 되돌아갈 곳이 없어서 부르는 것이므로
    // 스택에 한 겹을 더 쌓으면 안 된다.
    router.replace(fallback);
  }, [router, fallback]);
}
