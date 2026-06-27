// <!-- 년,월,일,요일 -->
function updateDateTime() {
  const todayDate = document.getElementById("todayDate");
  const currentTime = document.getElementById("currentTime");

  const now = new Date();

  if (todayDate) {
    todayDate.textContent = now.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  }

  if (currentTime) {
    currentTime.textContent = now.toLocaleTimeString("ko-KR");
  }
}

updateDateTime();
setInterval(updateDateTime, 1000);



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

// <!--   -->