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

/* "동영상 끊김 현상이 발생하나요?" 팝업 숨기기
 * 광고 차단(Brave Shields 등)을 감지했을 때 유튜브가 띄우는 알림입니다.
 * 유튜브 알림(snackbar-view-model)은 종류를 구분하는 속성이 없어 CSS로는
 * 이것만 골라낼 수 없으므로, 문구를 보고 이 알림만 숨깁니다.
 * 팝업만 가릴 뿐, 재생 전 지연 자체는 없애지 못합니다. */
const INTERRUPTION_TEXT = /끊김 현상|Experiencing interruptions/i;

function hideInterruptionToasts() {
  for (const toast of document.querySelectorAll("snackbar-view-model")) {
    if (INTERRUPTION_TEXT.test(toast.textContent)) {
      toast.style.setProperty("display", "none", "important");
    } else if (toast.style.display === "none") {
      // 같은 요소가 다른 알림에 재사용될 때 다시 보이게 합니다.
      toast.style.removeProperty("display");
    }
  }
}

// 알림 영역(snackbar-container)이 생기면 그 안만 지켜봅니다.
let watchedContainer = null;
const toastObserver = new MutationObserver(hideInterruptionToasts);

function watchSnackbar() {
  const container = document.querySelector("snackbar-container");
  if (!container || container === watchedContainer) return;
  watchedContainer = container;
  toastObserver.disconnect();
  toastObserver.observe(container, { childList: true, subtree: true, characterData: true });
  hideInterruptionToasts();
}

// 알림 영역은 늦게 만들어집니다. 문서 전체 감시는 ytd-app을 찾을 때까지만 하고,
// 그 뒤로는 ytd-app 바로 아래(알림 영역이 붙는 곳)만 지켜봅니다.
const pageObserver = new MutationObserver(() => {
  const app = document.querySelector("ytd-app");
  if (!app) return;
  pageObserver.disconnect();
  new MutationObserver(watchSnackbar).observe(app, { childList: true });
  watchSnackbar();
});
pageObserver.observe(document.documentElement, { childList: true, subtree: true });
