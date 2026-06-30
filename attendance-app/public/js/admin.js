/* =========================
  관리자 대시보드
========================= */

const dashboardTasks = [
  {
    title: "미확인 지각 사유",
    desc: "오늘 지각 직원 중 사유가 미확인인 기록이 3건 있습니다.",
    count: "3건",
    link: "admin-attendance-issue.html",
  },
  {
    title: "미출근 연락 필요",
    desc: "출근 예정 시간이 지났지만 아직 출근하지 않은 직원이 있습니다.",
    count: "2건",
    link: "admin-attendance-issue.html",
  },
  {
    title: "출퇴근 수정 요청",
    desc: "퇴근 누락, GPS 오류 등 수정이 필요한 기록이 있습니다.",
    count: "4건",
    link: "admin-attendance-edit.html",
  },
  {
    title: "신규 직원 정보 확인",
    desc: "최근 등록된 직원의 배정 지역 확인이 필요합니다.",
    count: "1건",
    link: "admin-employees.html",
  },
];

const regionStatus = [
  {
    name: "해운대 A구역",
    assigned: 6,
    working: 4,
    issue: 1,
  },
  {
    name: "서면 B구역",
    assigned: 8,
    working: 5,
    issue: 2,
  },
  {
    name: "남포동 C구역",
    assigned: 4,
    working: 3,
    issue: 0,
  },
];

const recentRequests = [
  {
    name: "박서연",
    type: "출퇴근 수정 요청",
    desc: "퇴근 누락 확인 요청",
    status: "미확인",
  },
  {
    name: "김다은",
    type: "현장 문의",
    desc: "비품 부족으로 추가 지급 요청",
    status: "확인중",
  },
  {
    name: "한지우",
    type: "위치 오류",
    desc: "지정 지역 안이지만 출근 실패",
    status: "미확인",
  },
];

const adminActivities = [
  {
    title: "박서연 퇴근 시간 수정",
    desc: "김관리자 · 10분 전",
    tag: "기록 수정",
  },
  {
    title: "서면 B구역 직원 배정 변경",
    desc: "김관리자 · 32분 전",
    tag: "지역 관리",
  },
  {
    title: "공지사항 등록",
    desc: "김관리자 · 1시간 전",
    tag: "공지",
  },
];

const dashboardDate = document.getElementById("dashboardDate");
const dashboardTaskList = document.getElementById("dashboardTaskList");
const dashboardRegionList = document.getElementById("dashboardRegionList");
const dashboardRequestList = document.getElementById("dashboardRequestList");
const dashboardActivityList = document.getElementById("dashboardActivityList");
const dashboardRefreshBtn = document.getElementById("dashboardRefreshBtn");

function setDashboardDate() {
  if (!dashboardDate) return;

  const today = new Date();

  const formattedDate = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });

  dashboardDate.textContent = `${formattedDate} 관리자 운영 현황을 확인합니다.`;
}

function renderDashboardTasks() {
  if (!dashboardTaskList) return;

  dashboardTaskList.innerHTML = dashboardTasks
    .map((task) => {
      return `
        <div class="dashboard-task-item">
          <div>
            <strong>${task.title}</strong>
            <p>${task.desc}</p>
          </div>
          <a href="${task.link}">${task.count}</a>
        </div>
      `;
    })
    .join("");
}

function renderRegionStatus() {
  if (!dashboardRegionList) return;

  dashboardRegionList.innerHTML = regionStatus
    .map((region) => {
      return `
        <div class="dashboard-region-item">
          <div class="dashboard-region-top">
            <strong>${region.name}</strong>
            <span>문제 ${region.issue}건</span>
          </div>

          <div class="dashboard-region-meta">
            <div>
              <p>배정</p>
              <strong>${region.assigned}명</strong>
            </div>

            <div>
              <p>근무중</p>
              <strong>${region.working}명</strong>
            </div>

            <div>
              <p>확인 필요</p>
              <strong>${region.issue}건</strong>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderRecentRequests() {
  if (!dashboardRequestList) return;

  dashboardRequestList.innerHTML = recentRequests
    .map((request) => {
      return `
        <div class="dashboard-request-item">
          <div class="dashboard-request-top">
            <strong>${request.name}</strong>
            <span>${request.status}</span>
          </div>
          <p>${request.type} · ${request.desc}</p>
        </div>
      `;
    })
    .join("");
}

function renderAdminActivities() {
  if (!dashboardActivityList) return;

  dashboardActivityList.innerHTML = adminActivities
    .map((activity) => {
      return `
        <div class="dashboard-activity-item">
          <div class="dashboard-activity-top">
            <strong>${activity.title}</strong>
            <span>${activity.tag}</span>
          </div>
          <p>${activity.desc}</p>
        </div>
      `;
    })
    .join("");
}

function handleDashboardRefresh() {
  alert("데이터 새로고침 기능은 Supabase 연결 후 구현하면 됩니다.");
}

function initDashboard() {
  setDashboardDate();
  renderDashboardTasks();
  renderRegionStatus();
  renderRecentRequests();
  renderAdminActivities();

  if (dashboardRefreshBtn) {
    dashboardRefreshBtn.addEventListener("click", handleDashboardRefresh);
  }
}

initDashboard();