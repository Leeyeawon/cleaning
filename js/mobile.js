 // <!-- 공통 하단배너  -->
const bottomNav = document.getElementById("bottomNav");
const currentPage = document.body.dataset.page;

if (bottomNav) {
  bottomNav.innerHTML = `
    <nav class="bottom-nav">
      <a href="index.html" class="nav-item ${currentPage === "home" ? "active" : ""}">
        <span>🏠</span>
        <p>홈</p>
      </a>

      <a href="attendancesheet.html" class="nav-item ${currentPage === "attendance" ? "active" : ""}">
        <span>📋</span>
        <p>출근부</p>
      </a>

      <a href="request.html" class="nav-item ${currentPage === "request" ? "active" : ""}">
        <span>✉️</span>
        <p>요청사항</p>
      </a>

      <a href="mypage.html" class="nav-item ${currentPage === "mypage" ? "active" : ""}">
        <span>👤</span>
        <p>내 정보</p>
      </a>
    </nav>
  `;
}