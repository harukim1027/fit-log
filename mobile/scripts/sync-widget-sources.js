#!/usr/bin/env node
/**
 * @file scripts/sync-widget-sources.js
 * @description Live Activity 네이티브 소스를 react-native-widget-extension 패키지로 복사한다.
 *
 * ── 이게 왜 있는가 ─────────────────────────────────────────────────────────
 * `react-native-widget-extension` 은 npm 배포본의 `ios/` 에 **podspec 파일 하나만**
 * 넣어 보낸다. podspec 은 `source_files = "**\/*.{h,m,swift}"` 를 선언하지만 실제
 * Swift 소스는 들어 있지 않다. 비어 있는 게 정상이다 — 설계가 그렇다.
 *
 * 그 자리를 채우는 것은 **config 플러그인**이다. `expo prebuild` 가 돌 때
 * `widgets/Module.swift` 와 `widgets/Attributes.swift` 를 패키지의 `ios/` 로
 * 복사한다(plugin/build/lib/getWidgetFiles.js 끝부분).
 * 그래야 CocoaPods 가 Swift 모듈을 만들고, Expo 가 자동 생성하는
 * `ExpoModulesProvider.swift` 의 `import ReactNativeWidgetExtension` 이 통한다.
 *
 * ── 그래서 무엇이 문제인가 ─────────────────────────────────────────────────
 * 그 복사본이 **node_modules 안에 산다.** 두 조건이 겹치면 사라진 채로 남는다.
 *
 *   1. `npm ci` / `rm -rf node_modules` / 패키지 매니저 교체 → 복사본 삭제
 *   2. `ios/` 디렉터리가 이미 있으면 `expo run:ios` 가 **프리빌드를 건너뛴다**
 *      → 플러그인이 안 돌고 → 복사도 다시 안 된다
 *
 * 그러면 빌드가 이렇게 깨진다:
 *
 *   ❌ ios/Pods/Target Support Files/Pods-Harulog/ExpoModulesProvider.swift:27
 *      import ReactNativeWidgetExtension
 *             ^ cannot load underlying module for 'ReactNativeWidgetExtension'
 *
 * ★ 2026-09-20 pnpm 설치 때 정확히 이 일이 일어났고, 원인을 찾는 데 이틀이 걸렸다.
 *   에러 메시지가 "패키지가 깨졌다"처럼 보여서 엉뚱한 곳을 팠다.
 *   같은 메시지를 또 보면 **먼저 이 스크립트를 돌려 볼 것.**
 *
 * ── 언제 도는가 ───────────────────────────────────────────────────────────
 * `package.json` 의 `postinstall` 에 걸려 있어 `npm install` / `npm ci` 뒤에
 * 자동으로 돈다. 손으로 돌리려면 `npm run sync:widgets`.
 *
 * EAS 빌드에서도 postinstall 은 돌고, 그 뒤 EAS 가 프리빌드를 다시 돌려 같은 파일을
 * 같은 내용으로 덮어쓴다. **중복이지 충돌이 아니다** (`ios/` 가 gitignore 라
 * EAS 에는 업로드되지 않고, 따라서 EAS 는 항상 프리빌드부터 시작한다).
 *
 * ── 지키는 규칙 ───────────────────────────────────────────────────────────
 * - **설치를 절대 깨뜨리지 않는다.** 무슨 일이 있어도 exit 0.
 *   여기서 1을 반환하면 `npm ci` 가 통째로 실패하고, 그게 복사 실패보다 나쁘다.
 * - **조용히 실패하지 않는다.** 못 하면 이유를 찍는다. 아무 말 없이 넘어가면
 *   위의 이틀이 반복된다.
 * - 정본은 `widgets/` 다. 패키지 쪽 사본을 고치지 말 것 — 다음 설치에 날아간다.
 */
const fs = require("fs");
const path = require("path");

const TAG = "[sync-widget-sources]";
const PKG = "react-native-widget-extension";
/** 플러그인 기본값과 같아야 한다 (plugin/build/index.js 의 moduleFileName/attributesFileName). */
const FILES = ["Module.swift", "Attributes.swift"];

function widgetsFolder(root) {
  // app.json 의 플러그인 옵션을 따라간다. 거기서 바뀌면 여기도 따라가야 한다.
  try {
    const app = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
    const entry = (app.expo?.plugins ?? []).find(
      (p) => Array.isArray(p) && p[0] === PKG,
    );
    return entry?.[1]?.widgetsFolder ?? "widgets";
  } catch {
    return "widgets";
  }
}

function main() {
  const root = path.resolve(__dirname, "..");
  const srcDir = path.join(root, widgetsFolder(root));
  const destDir = path.join(root, "node_modules", PKG, "ios");

  if (!fs.existsSync(destDir)) {
    // 패키지가 없거나(의존성에서 빠짐) 설치가 아직 안 끝난 상태.
    console.warn(`${TAG} 건너뜀 — ${path.relative(root, destDir)} 가 없다.`);
    console.warn(`${TAG} ${PKG} 가 의존성에 있는지 확인할 것.`);
    return;
  }

  let copied = 0;
  for (const file of FILES) {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file);
    if (!fs.existsSync(src)) {
      console.warn(`${TAG} 원본 없음: ${path.relative(root, src)} — 이 파일은 건너뛴다.`);
      continue;
    }
    const srcBuf = fs.readFileSync(src);
    if (fs.existsSync(dest) && fs.readFileSync(dest).equals(srcBuf)) continue; // 이미 같다
    fs.writeFileSync(dest, srcBuf);
    copied++;
  }

  if (copied > 0) {
    console.log(`${TAG} Live Activity 소스 ${copied}개를 ${PKG} 로 복사했다.`);
  }
}

try {
  main();
} catch (e) {
  // 설치를 깨뜨리지 않는다. 다만 무슨 일이 있었는지는 남긴다.
  console.warn(`${TAG} 실패 — 네이티브 빌드에서 'cannot load underlying module' 이 나면`);
  console.warn(`${TAG} 'npm run sync:widgets' 를 직접 돌려 볼 것. 사유: ${e?.message ?? e}`);
}
process.exit(0);
