/**
 * 하루일지 랜딩 — 섹션 스켈레톤.
 *
 * ── 이 파일의 상태 ────────────────────────────────────────────────────────
 * 구조·레이아웃·반응형·접근성은 완성이다. **본문 문구는 플레이스홀더**이고
 * 스크린샷은 자리만 잡혀 있다(아래 `SHOTS`, `HERO_SHOT_ALT`).
 *
 * ── 색 ────────────────────────────────────────────────────────────────────
 * hex 를 쓰지 않는다. `globals.css` 의 브랜드 토큰 9색만 유틸리티로 쓴다
 * (bg-background / bg-surface / bg-surface-alt / border-border / text-primary /
 *  text-text-primary / text-text-secondary / bg-primary / text-on-accent).
 *
 * `text-muted` 는 **쓰지 않는다.** 실측 대비가 다크 2.59–3.34:1 /
 * 라이트 2.17–2.47:1 로 두 테마 모두 본문 기준(4.5:1)에 한참 미달한다.
 * 토큰으로 복사해 뒀지만 랜딩에 쓸 자리가 없다 — 제거 후보다.
 *
 * ── 브레이크포인트 ────────────────────────────────────────────────────────
 * **md(768px) 하나만 쓴다.** 사유는 아래 각 섹션 주석.
 */

/**
 * ★ App Store 버튼 — 아직 결정되지 않았다. 지금은 가장 안전한 상태다.
 *
 * 앱이 심사 전(TestFlight)이라 누를 수 있는 스토어 링크가 존재하지 않는다.
 * 그래서 **버튼을 아예 렌더하지 않고** 상태 칩만 보여준다. 비활성 버튼을 두면
 * 눌리는 것처럼 보이는데 아무 일도 안 일어나고, 이 페이지는 포트폴리오로도
 * 쓰이므로 그 인상이 가장 비싸다. 클릭 가능한 외형 자체를 만들지 않는 쪽이 낫다.
 *
 * 바꾸는 방법은 `url` 한 줄이다:
 *   url: null                          → 상태 칩 (현재)
 *   url: "https://testflight.apple.com/join/XXXX", label: "TestFlight 로 먼저 보기"
 *   url: "https://apps.apple.com/app/idXXXX",      label: "App Store 에서 받기"
 * 세 경우 모두 아래 <StoreCta> 가 그대로 처리한다.
 */
const STORE: { url: string | null; label: string } = {
  url: null,
  label: "출시 준비 중",
};

/** 문의 메일 — ★ 플레이스홀더. 실제 주소로 교체해야 한다. */
const CONTACT_EMAIL = "contact@example.com";

/**
 * 히어로 스크린샷의 alt. 이미지를 넣을 때 이 문자열을 <img alt> 로 그대로 옮긴다
 * (지금은 자리 표시용 div 의 aria-label 로 쓰인다).
 */
const HERO_SHOT_ALT = "하루일지 홈 화면. 주간 운동 현황 카드와 오늘의 기록 요약.";

/**
 * 갤러리 4장. 현재 보여줄 만한 화면만 담았다.
 * 이미지가 생기면 `src` 를 채우고 placeholder 를 <img> 로 교체한다.
 */
const SHOTS = [
  { caption: "홈", alt: "주간 운동 현황을 보여주는 히어로 카드와 오늘 기록 요약." },
  { caption: "운동 기록", alt: "운동 세션 화면. 종목별 세트의 무게와 횟수를 입력하는 중." },
  { caption: "통계", alt: "종목별 성장 그래프와 주간 볼륨 추이." },
  { caption: "루틴", alt: "저장해 둔 루틴 목록. 부위별로 정렬돼 있다." },
] as const;

/** 기능 4개. 1번이 한 줄 소개와 직결되는 핵심이라 `lead` 로 따로 둔다. */
const LEAD_FEATURE = {
  title: "설정 항목 커스터마이징",
  body: "기록할 항목을 직접 고른다. 쓰지 않는 칸은 지우고, 필요한 칸은 추가한다. (문구 확정 전)",
};

const FEATURES = [
  {
    title: "주간 목표와 자극 부위 추적",
    body: "한 주 단위로 목표를 세우고 어느 부위를 얼마나 했는지 본다. (문구 확정 전)",
  },
  {
    title: "루틴 저장·결합",
    body: "쓰던 루틴을 저장하고 두 개를 합쳐 새 세션을 만든다. (문구 확정 전)",
  },
  {
    title: "종목별 성장 그래프",
    body: "같은 종목의 무게가 몇 주에 걸쳐 어떻게 올라갔는지 본다. (문구 확정 전)",
  },
] as const;

/**
 * 폰 스크린샷 자리.
 *
 * ★ 비율을 `1290 / 2796` 으로 고정한다. App Store Connect 6.9" 스크린샷 규격
 *   (1290×2796) 이고, 동시에 Face ID 세대 아이폰 전체의 화면 비율이다 —
 *   1125×2436(X) 0.4618, 1179×2556(15) 0.4613, 1206×2622(16 Pro) 0.4600,
 *   1320×2868(16 Pro Max) 0.4603. 편차가 최대 0.0018 이라 폭 300px 기준
 *   높이 차이가 2px 미만이다. 즉 어느 기기로 찍어 넣어도 레이아웃이 흔들리지 않는다.
 *   (`mobile/app.json` 의 `orientation: "portrait"`, iOS 타깃 기준.)
 *
 * aspect-ratio 로 미리 공간을 확보하므로 이미지 로딩 시 CLS 가 0 이다.
 * 이미지를 넣을 때는 이 div 를 `next/image` 로 교체한다 — 지금은 파일이 없어
 * 의존성을 늘리지 않는다.
 */
function ShotPlaceholder({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex aspect-[1290/2796] items-center justify-center rounded-3xl border border-border bg-surface-alt p-4 ${className}`}
    >
      <span className="text-center text-sm font-medium text-text-secondary">
        스크린샷 자리
      </span>
    </div>
  );
}

/** 주요 CTA. 라벨 크기가 접근성 제약이므로 한 군데서만 정의한다. */
function StoreCta() {
  // ★ text-xl(20px) + font-bold 를 **줄이지 말 것.**
  // 라이트 테마에서 on-accent(#ffffff) on primary(#1e7aea) 의 실측 대비는
  // 4.18:1 이다. WCAG AA 일반 텍스트 기준 4.5:1 에는 미달하지만, 대형 텍스트
  // 기준(18.66px 이상 bold → 3:1)은 통과한다. 크기를 내리면 그 순간 깨진다.
  // (앱 라이트 모드에서 같은 조합이 4.17:1 로 걸린 전례가 DESIGN.md 에 있다.)
  const shared = "inline-flex items-center justify-center rounded-full px-8 py-4 text-xl font-bold";

  if (STORE.url === null) {
    return (
      <p className={`${shared} border border-border bg-surface-alt text-text-primary`}>
        {STORE.label}
      </p>
    );
  }

  return (
    <a href={STORE.url} className={`${shared} bg-primary text-on-accent`}>
      {STORE.label}
    </a>
  );
}

export default function Home() {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center px-5 py-4 md:px-8">
          <span className="text-lg font-bold tracking-tight">하루일지</span>
        </div>
      </header>

      <main>
        {/* ── 히어로 ──────────────────────────────────────────────────────
            md 미만: 텍스트 → 이미지 세로 1단.
            md 이상: 좌 텍스트 / 우 이미지 2단.
            이미지 쪽에 max-w 를 걸어 와이드 화면에서 폰 목업이 과대해지는 것을 막는다. */}
        <section
          aria-labelledby="hero-title"
          className="mx-auto w-full max-w-6xl px-5 py-16 md:grid md:grid-cols-2 md:items-center md:gap-12 md:px-8 md:py-24"
        >
          <div>
            <h1
              id="hero-title"
              className="text-[2rem] font-extrabold leading-tight tracking-tight md:text-5xl"
            >
              하루일지
            </h1>
            <p className="mt-4 text-lg font-medium text-text-secondary md:mt-6 md:text-xl">
              설정 항목부터 내가 만드는 운동 기록
            </p>
            <div className="mt-8 md:mt-10">
              <StoreCta />
            </div>
          </div>

          {/* 모바일에서 이미지가 화면을 다 먹지 않도록 폭을 제한한다 —
              9:19.5 는 폭의 2.17배 높이라 전폭으로 두면 한 장이 뷰포트를 넘긴다. */}
          <div className="mx-auto mt-12 w-full max-w-[280px] md:mt-0 md:max-w-[320px]">
            <ShotPlaceholder label={HERO_SHOT_ALT} />
          </div>
        </section>

        {/* ── 기능 4개 ────────────────────────────────────────────────────
            1번(설정 항목 커스터마이징)에 무게를 준다. 자세한 근거는 보고 참조.
            장치는 두 개이고 둘 다 색이 아니다 — 색 예산은 CTA 가 쓴다.
              1. 자리: 혼자 전폭(md:col-span-3)을 쓴다.
              2. 크기: 제목이 다른 셋보다 한 단 크다.
            2번 장치가 필요한 이유 — 모바일에서는 전부 1단이 되어 col-span 차이가
            사라진다. 크기 차이는 1단에서도 살아남는다. */}
        <section
          aria-labelledby="features-title"
          className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-24"
        >
          <h2 id="features-title" className="text-2xl font-bold tracking-tight md:text-3xl">
            기능
          </h2>

          <div className="mt-8 grid gap-4 md:mt-12 md:grid-cols-3">
            <article className="rounded-3xl border border-border bg-surface p-6 md:col-span-3 md:p-10">
              <h3 className="text-xl font-bold md:text-2xl">{LEAD_FEATURE.title}</h3>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-text-secondary">
                {LEAD_FEATURE.body}
              </p>
            </article>

            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="rounded-3xl border border-border bg-surface p-6"
              >
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-text-secondary">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── 스크린샷 갤러리 ─────────────────────────────────────────────
            md 미만: 가로 스크롤 + scroll-snap. 4장을 세로로 쌓으면 9:19.5 × 4 라
                     3,000px 넘게 스크롤해야 하고, 2열 그리드로 줄이면 한 장이
                     180px 폭이 되어 화면 내용을 읽을 수 없다. 가로 스크롤이
                     한 장을 80vw 로 크게 유지하면서 섹션 높이를 한 화면에 묶는다.
            md 이상: 4열 그리드. 전체가 한눈에 들어오고 스크롤이 필요 없다.
            CSS 만으로 한다 — 캐러셀 라이브러리를 넣지 않는다. */}
        <section
          aria-labelledby="gallery-title"
          className="py-16 md:py-24"
        >
          <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
            <h2 id="gallery-title" className="text-2xl font-bold tracking-tight md:text-3xl">
              화면
            </h2>
          </div>

          {/* 스크롤 영역에 tabIndex 를 준다 — 마우스 없이 가로 스크롤할 방법이
              있어야 한다(WCAG 2.1.1). md 이상에서는 overflow 가 사라져 탭 스톱이
              하는 일이 없지만, 포커스 링만 뜨고 해는 없다. */}
          <div
            role="group"
            aria-label="앱 스크린샷 모아보기"
            tabIndex={0}
            className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 md:mx-auto md:mt-12 md:grid md:w-full md:max-w-6xl md:grid-cols-4 md:overflow-x-visible md:px-8 md:pb-0"
          >
            {SHOTS.map((shot) => (
              <figure
                key={shot.caption}
                className="w-[70vw] max-w-[260px] shrink-0 snap-center md:w-auto md:max-w-none"
              >
                <ShotPlaceholder label={shot.alt} />
                <figcaption className="mt-3 text-center text-sm font-medium text-text-secondary">
                  {shot.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── 다운로드 CTA ────────────────────────────────────────────────
            히어로와 같은 <StoreCta> 를 재사용한다. 스토어 상태가 두 군데서
            어긋날 수 없다. */}
        <section
          aria-labelledby="download-title"
          className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-24"
        >
          <div className="rounded-3xl border border-border bg-surface px-6 py-12 text-center md:px-10 md:py-16">
            <h2 id="download-title" className="text-2xl font-bold tracking-tight md:text-3xl">
              하루일지 받기
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-text-secondary">
              iPhone 에서 쓸 수 있다. (문구 확정 전)
            </p>
            <div className="mt-8 flex justify-center">
              <StoreCta />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 text-sm md:flex-row md:items-center md:justify-between md:px-8">
          <p className="font-medium">하루일지</p>

          <nav aria-label="사이트 정보">
            <ul className="flex flex-col gap-3 md:flex-row md:gap-8">
              <li>
                {/* ★ /privacy 페이지는 아직 없다. 이 링크는 지금 404 다.
                    별도 작업으로 작성한다. */}
                <a href="/privacy" className="font-medium text-text-secondary underline">
                  개인정보처리방침
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-medium text-text-secondary underline"
                >
                  문의
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </>
  );
}
