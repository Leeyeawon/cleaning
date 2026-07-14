import {
  requireAdmin,
  logoutAdmin,
} from "./adminAuth.js";

const currentAdmin = await requireAdmin();

if (!currentAdmin) {
  throw new Error("ADMIN_AUTH_REQUIRED");
}

function escapeAdminHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAdminRoleText(role) {
  if (role === "owner") {
    return "최고 관리자";
  }

  return "관리자";
}

const adminDisplayName =
  currentAdmin.name || "관리자";

const adminInitial =
  adminDisplayName.trim().slice(0, 1) || "관";

/* 관리자용 공통 좌측 사이드바 */

const adminSidebar = document.getElementById("adminSidebar");
const currentAdminPage = document.body.dataset.adminPage;

const attendancePages = [
  "attendance",
  "attendance-issue",
  "attendance-monthly",
  "attendance-edit",
];

const isAttendanceOpen = attendancePages.includes(currentAdminPage);

if (adminSidebar) {
  adminSidebar.innerHTML = `
    <aside class="admin-sidebar">
      <div class="admin-sidebar-logo">
        <div class="admin-logo-box">A</div>

        <div>
          <h1>근태관리 Admin</h1>
          <p>${escapeAdminHtml(
            getAdminRoleText(currentAdmin.role)
          )}</p>
        </div>
      </div>

      <nav class="admin-sidebar-menu">
        <a href="admin.html" class="admin-menu-item ${currentAdminPage === "admin" ? "active" : ""}">
          <span></span>
          <p>대시보드</p>
        </a>

        <div class="admin-menu-group ${isAttendanceOpen ? "open" : ""}">
          <a href="admin-attendance.html" class="admin-menu-item admin-menu-parent ${isAttendanceOpen ? "active" : ""}">
            <span></span>
            <p>출퇴근 관리</p>
            <b>⌄</b>
          </a>

          <div class="admin-sub-menu">
            <a href="admin-attendance.html" class="admin-sub-menu-item ${currentAdminPage === "attendance" ? "active" : ""}">
              오늘 출퇴근 현황
            </a>

            <a href="admin-attendance-issue.html" class="admin-sub-menu-item ${currentAdminPage === "attendance-issue" ? "active" : ""}">
              지각·미출근 관리
            </a>

            <a href="admin-attendance-monthly.html" class="admin-sub-menu-item ${currentAdminPage === "attendance-monthly" ? "active" : ""}">
              월간 출근부
            </a>

            <a href="admin-attendance-edit.html" class="admin-sub-menu-item ${currentAdminPage === "attendance-edit" ? "active" : ""}">
              출퇴근 기록 수정
            </a>
          </div>
        </div>

        <a
          href="admin-requests.html"
          class="admin-menu-item ${
            currentAdminPage === "requests"
              ? "active"
              : ""
          }"
        >
          <span></span>
          <p>요청사항 관리</p>
        </a>

        <a href="admin-employees.html" class="admin-menu-item ${currentAdminPage === "employees" ? "active" : ""}">
          <span></span>
          <p>직원 관리</p>
        </a>

        <a href="admin-departments.html" class="admin-menu-item ${currentAdminPage === "departments" ? "active" : ""}">
          <span></span>
          <p>근무지역 관리</p>
        </a>

        <a href="admin-notices.html" class="admin-menu-item ${currentAdminPage === "notices" ? "active" : ""}">
          <span></span>
          <p>공지사항</p>
        </a>

        <a href="admin-settings.html" class="admin-menu-item ${currentAdminPage === "settings" ? "active" : ""}">
          <span>⚙️</span>
          <p>설정</p>
        </a>
      </nav>

      <div class="admin-sidebar-user">
        <div class="admin-user-avatar">
          ${escapeAdminHtml(adminInitial)}
        </div>

        <div class="admin-user-info">
          <strong> ${escapeAdminHtml(adminDisplayName)} </strong>
          <p> ${escapeAdminHtml(currentAdmin.email)} </p>
        </div>

        <button
          id="adminLogoutBtn"
          class="admin-logout-btn"
          type="button"
          aria-label="관리자 로그아웃"
        >
          ↗
        </button>
      </div>
    </aside>
  `;
}

const adminLogoutBtn =
  document.getElementById("adminLogoutBtn");

adminLogoutBtn?.addEventListener(
  "click",
  async () => {
    const confirmed = confirm(
      "관리자 계정에서 로그아웃하시겠습니까?"
    );

    if (!confirmed) return;

    adminLogoutBtn.disabled = true;

    await logoutAdmin();
  }
);

/* 사이드바 하위 메뉴 열기 / 닫기 */

document
  .querySelectorAll(".admin-menu-group")
  .forEach((menuGroup) => {
    const menuParent =
      menuGroup.querySelector(".admin-menu-parent");

    if (!menuParent) return;

    menuParent.addEventListener("click", (event) => {
      event.preventDefault();

      menuGroup.classList.toggle("open");
    });
  });

/* 관리자 상단 알림 버튼 */

const adminNotifications = [
  {
    type: "긴급",
    title: "미출근 직원 2명",
    desc: "출근 예정 시간이 지났지만 출근 기록이 없습니다.",
    time: "방금 전",
    link: "admin-attendance-issue.html",
  },
  {
    type: "확인 필요",
    title: "지각 사유 미확인 3건",
    desc: "지각 처리된 직원의 사유 확인이 필요합니다.",
    time: "5분 전",
    link: "admin-attendance-issue.html",
  },
  {
    type: "위치 오류",
    title: "위치 오류 출근 시도 1건",
    desc: "배정 지역 밖에서 출근을 시도한 기록이 있습니다.",
    time: "12분 전",
    link: "admin-attendance-issue.html",
  },
  {
    type: "수정 필요",
    title: "출퇴근 수정 요청 4건",
    desc: "출근 또는 퇴근 누락 기록 확인이 필요합니다.",
    time: "20분 전",
    link: "admin-attendance-edit.html",
  },
  {
    type: "안내",
    title: "미배정 직원 5명",
    desc: "신규 직원의 근무지역 배정이 필요합니다.",
    time: "1시간 전",
    link: "admin-employees.html",
  },
];

function createAdminNotification() {
  const headerActions = document.querySelector(".top-header .header-actions");

  if (!headerActions) return;

  const notificationBox = document.createElement("div");
  notificationBox.className = "admin-notification";

  notificationBox.innerHTML = `
    <button type="button" class="admin-notification-button" id="adminNotificationBtn">
      <span>알림</span>
      <strong>${adminNotifications.length}</strong>
    </button>

    <div class="admin-notification-dropdown" id="adminNotificationDropdown">
      <div class="admin-notification-header">
        <strong>알림</strong>
        <span>${adminNotifications.length}건</span>
      </div>

      <div class="admin-notification-list">
        ${adminNotifications
          .map((notice) => {
            return `
              <a href="${notice.link}" class="admin-notification-item">
                <div class="admin-notification-item-top">
                  <span>${notice.type}</span>
                  <em>${notice.time}</em>
                </div>

                <strong>${notice.title}</strong>
                <p>${notice.desc}</p>
              </a>
            `;
          })
          .join("")}
      </div>

      <a href="admin.html" class="admin-notification-more">
        전체 알림 보기 ›
      </a>
    </div>
  `;

  headerActions.prepend(notificationBox);

  const notificationBtn = document.getElementById("adminNotificationBtn");
  const notificationDropdown = document.getElementById("adminNotificationDropdown");

  notificationBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    notificationDropdown.classList.toggle("open");
  });

  document.addEventListener("click", (event) => {
    if (!notificationBox.contains(event.target)) {
      notificationDropdown.classList.remove("open");
    }
  });
}

createAdminNotification();