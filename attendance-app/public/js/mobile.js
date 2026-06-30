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