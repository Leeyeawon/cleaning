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
          <p>최고 관리자</p>
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

        <a href="admin-request.html" class="admin-menu-item ${currentAdminPage === "request" ? "active" : ""}">
          <span></span>
          <p>요청사항 관리</p>
          <em>5</em>
        </a>

        <a href="admin-employees.html" class="admin-menu-item ${currentAdminPage === "employees" ? "active" : ""}">
          <span></span>
          <p>직원 관리</p>
        </a>

        <a href="admin-departments.html" class="admin-menu-item ${currentAdminPage === "departments" ? "active" : ""}">
          <span></span>
          <p>부서 관리</p>
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
        <div class="admin-user-avatar">김</div>

        <div class="admin-user-info">
          <strong>김관리자</strong>
          <p>admin@company.com</p>
        </div>

        <button class="admin-logout-btn" type="button">↗</button>
      </div>
    </aside>
  `;
}

/*  */