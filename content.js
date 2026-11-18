/* YouTube Focus — content script
 *
 * 하는 일은 두 가지뿐입니다.
 *   1) 저장된 설정을 <html>의 data-ytf-* 속성으로 옮긴다 (실제 숨김은 CSS가 함)
 *   2) 유튜브가 SPA라 주소만 바뀌는 경우를 감지해 현재 페이지 종류를 표시한다
 */

const DEFAULTS = {
  home: true,       // 홈 피드 숨기기
  related: true,    // 영상 페이지 추천 숨기기
  endscreen: true,  // 종료 화면 / 일시정지 추천 숨기기
  comments: true,   // 댓글 숨기기
  center: true      // 영상 가운데 정렬
};

const root = document.documentElement;

function apply(settings) {
  for (const key of Object.keys(DEFAULTS)) {
    root.setAttribute(`data-ytf-${key}`, settings[key] ? "on" : "off");
  }
}

// 저장소를 읽기 전에 기본값부터 적용해 첫 프레임에 영상이 스치는 것을 막습니다.
apply(DEFAULTS);

chrome.storage.sync.get(DEFAULTS, (stored) => {
  if (chrome.runtime.lastError) return;
  apply({ ...DEFAULTS, ...stored });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  chrome.storage.sync.get(DEFAULTS, (stored) => apply({ ...DEFAULTS, ...stored }));
});

/* 현재 페이지 종류 표시 (홈 첫 로딩 깜빡임 방지용 보조 장치) */
function markPage() {
  const { pathname } = location;
  let page = "other";
  if (pathname === "/" || pathname === "") page = "home";
  else if (pathname === "/watch") page = "watch";
  else if (pathname === "/results") page = "search";
  root.setAttribute("data-ytf-page", page);
}

markPage();

// 유튜브는 화면을 새로 그릴 때 이 이벤트를 쏩니다.
document.addEventListener("yt-navigate-start", markPage, true);
document.addEventListener("yt-navigate-finish", markPage, true);
// 뒤로가기 등 이벤트가 오지 않는 경우에 대한 보험
window.addEventListener("popstate", markPage);
