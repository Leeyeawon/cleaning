/* =========================
  직원 앱 모바일 공통 기능
========================= */

document.addEventListener("DOMContentLoaded", () => {
  renderBottomNav();
  initTextSizeMode();
});

/* =========================
  하단 메뉴
========================= */

function renderBottomNav() {
  const bottomNav =
    document.getElementById("bottomNav");

  if (!bottomNav) return;

  const currentPage = getCurrentPageName();

  const navItems = [
    {
      page: "index.html",
      icon: "🏠",
      label: "홈",
      href: "./index.html",
    },
    {
      page: "attendancesheet.html",
      icon: "📅",
      label: "출근부",
      href: "./attendancesheet.html",
    },
    {
      page: "request.html",
      icon: "📝",
      label: "요청",
      href: "./request.html",
    },
    {
      page: "mypage.html",
      icon: "👤",
      label: "내 정보",
      href: "./mypage.html",
    },
  ];

  bottomNav.innerHTML = `
    <nav class="bottom-nav">
      ${navItems
        .map((item) => {
          const isActive =
            currentPage === item.page;

          return `
            <a
              href="${item.href}"
              class="nav-item ${
                isActive ? "active" : ""
              }"
            >
              <span class="nav-icon">
                ${item.icon}
              </span>

              <span class="nav-label">
                ${item.label}
              </span>
            </a>
          `;
        })
        .join("")}
    </nav>
  `;
}

function getCurrentPageName() {
  const path = window.location.pathname;

  const pageName =
    path.substring(
      path.lastIndexOf("/") + 1
    );

  return pageName || "index.html";
}

/* =========================
  큰글자 모드
========================= */

function initTextSizeMode() {
  const fontToggleBtn =
    document.getElementById("fontToggleBtn");

  /*
    설정한 적이 없는 사용자는
    큰글자 모드를 기본값으로 사용
  */
  const savedMode =
    localStorage.getItem("textSizeMode");

  const initialMode =
    savedMode === "normal"
      ? "normal"
      : "large";

  applyTextSizeMode(
    initialMode,
    fontToggleBtn
  );

  fontToggleBtn?.addEventListener(
    "click",
    () => {
      const nextMode =
        document.body.classList.contains(
          "large-mode"
        )
          ? "normal"
          : "large";

      localStorage.setItem(
        "textSizeMode",
        nextMode
      );

      applyTextSizeMode(
        nextMode,
        fontToggleBtn
      );
    }
  );
}

function applyTextSizeMode(
  mode,
  fontToggleBtn
) {
  const isLarge = mode === "large";

  document.body.classList.toggle(
    "large-mode",
    isLarge
  );

  if (!fontToggleBtn) return;

  const fontText =
    fontToggleBtn.querySelector(
      ".font-text"
    );

  const buttonLabel =
    isLarge
      ? "기본글자"
      : "큰글자";

  if (fontText) {
    fontText.textContent = buttonLabel;
  } else {
    fontToggleBtn.textContent =
      buttonLabel;
  }

  fontToggleBtn.setAttribute(
    "aria-label",
    isLarge
      ? "기본 글자로 변경"
      : "큰글자로 변경"
  );
}