/* =========================
  직원 앱 모바일 공통 하단바
========================= */

document.addEventListener("DOMContentLoaded", () => {
  renderBottomNav();
});

function renderBottomNav() {
  const bottomNav = document.getElementById("bottomNav");

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
          const isActive = currentPage === item.page;

          return `
            <a href="${item.href}" class="nav-item ${isActive ? "active" : ""}">
              <span class="nav-icon">${item.icon}</span>
              <span class="nav-label">${item.label}</span>
            </a>
          `;
        })
        .join("")}
    </nav>
  `;
}

function getCurrentPageName() {
  const path = window.location.pathname;
  const pageName = path.substring(path.lastIndexOf("/") + 1);

  return pageName || "index.html";
}

// <!-- 큰 글자 모드  -->

// 1. 페이지가 열릴 때 기존에 설정한 글자 크기 불러오기
const savedSizeMode = localStorage.getItem("textSizeMode");
const fontToggleBtn = document.getElementById("fontToggleBtn");

if (savedSizeMode === "large") {
  document.body.classList.add("large-mode");
  if (fontToggleBtn) fontToggleBtn.textContent = "🔍 기본 글자";
}

// 2. 버튼 클릭 시 토글 기능
if (fontToggleBtn) {
  fontToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("large-mode");
    
    const isLarge = document.body.classList.contains("large-mode");
    if (isLarge) {
      localStorage.setItem("textSizeMode", "large");
      fontToggleBtn.textContent = "🔍 기본 글자";
      alert(" 큰글자 모드가 켜졌습니다.");
    } else {
      localStorage.setItem("textSizeMode", "normal");
      fontToggleBtn.textContent = "🔍 글자 크게";
      alert("기본 글자 크기로 변경되었습니다.");
    }
  });
}