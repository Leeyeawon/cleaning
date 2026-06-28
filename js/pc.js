
/* 관리자용 공통 좌측 사이드바 */

const adminSidebar = document.getElementById("adminSidebar");
const currentAdminPage = document.body.dataset.adminPage;

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
          <span>📊</span>
          <p>대시보드</p>
        </a>

        <a href="admin-attendance.html" class="admin-menu-item ${currentAdminPage === "attendance" ? "active" : ""}">
          <span>🕘</span>
          <p>출퇴근 관리</p>
        </a>

        <a href="admin-monthly.html" class="admin-menu-item ${currentAdminPage === "monthly" ? "active" : ""}">
          <span>📅</span>
          <p>월간 출근부</p>
        </a>

        <a href="admin-employees.html" class="admin-menu-item ${currentAdminPage === "employees" ? "active" : ""}">
          <span>👥</span>
          <p>직원 관리</p>
        </a>

        <a href="admin-departments.html" class="admin-menu-item ${currentAdminPage === "departments" ? "active" : ""}">
          <span>🏢</span>
          <p>부서 관리</p>
        </a>

        <a href="admin-notices.html" class="admin-menu-item ${currentAdminPage === "notices" ? "active" : ""}">
          <span>📢</span>
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

        <button class="admin-logout-btn">↗</button>
      </div>
    </aside>
  `;
}

/* 관리자용 공통 좌측 사이드바 */