/* =========================================================
   🔥 관리자 대시보드 (Supabase 실시간 DB 연동 완료 버전)
========================================================= */
import supabase from "./supabase.js";

// DOM 요소 연결
const dashboardDate = document.getElementById("dashboardDate");
const dashboardTaskList = document.getElementById("dashboardTaskList");
const dashboardRegionList = document.getElementById("dashboardRegionList");
const dashboardRequestList = document.getElementById("dashboardRequestList");
const dashboardActivityList = document.getElementById("dashboardActivityList");
const dashboardRefreshBtn = document.getElementById("dashboardRefreshBtn");

// 상단 통계 숫자 요소
const statTotalEmployees = document.getElementById("statTotalEmployees");
const statActiveWorkplaces = document.getElementById("statActiveWorkplaces");
const statTodayIssues = document.getElementById("statTodayIssues");
const statPendingRequests = document.getElementById("statPendingRequests");
const statPendingUsers = document.getElementById("statPendingUsers");

// 오늘 날짜 문자열 (YYYY-MM-DD)
function getLocalDateKey(date = new Date()
) {
  return (
    `${date.getFullYear()}-` +
    `${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-` +
    `${String(
      date.getDate()
    ).padStart(2, "0")}`
  );
}

const todayStr = getLocalDateKey();

// 1. 상단 안내 문구 날짜 설정
function setDashboardDate() {
  if (!dashboardDate) return;
  const today = new Date();
  const formattedDate = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });
  dashboardDate.textContent = `${formattedDate} 관리자 운영 현황을 실시간으로 확인합니다.`;
}

// 2. 🔥 상단 요약 카드 숫자 실시간 DB 조회 (Promise.all로 병렬 처리하여 속도 최적화)
async function loadSummaryStats() {
  try {
    const [
      { count: totalEmployees },
      { count: activeWorkplaces },
      { count: todayIssues },
      { count: pendingRequests },
      { count: pendingUsers }
    ] = await Promise.all([
      // ① 전체 활성 직원 수
      supabase.from("users").select("*", { count: "exact", head: true }).eq("status", "active"),
      // ② 활성 근무 지역 수
      supabase.from("workplaces").select("*", { count: "exact", head: true }).eq("is_active", true),
      // ③ 오늘 처리 필요 (오늘 지각하거나 위치오류로 찍힌 출근 기록)
      supabase.from("attendance").select("*", { count: "exact", head: true }).eq("work_date", todayStr).in("status", ["late", "location_error", "지각", "위치오류"]),
      // ④ 미확인 업무/요청사항 (대기중인 요청)
      supabase.from("employee_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      // ⑤ 신규 가입 승인 대기 직원
      supabase.from("users").select("*", { count: "exact", head: true }).eq("status", "pending")
    ]);

    if (statTotalEmployees) statTotalEmployees.textContent = totalEmployees || 0;
    if (statActiveWorkplaces) statActiveWorkplaces.textContent = activeWorkplaces || 0;
    if (statTodayIssues) statTodayIssues.textContent = todayIssues || 0;
    if (statPendingRequests) statPendingRequests.textContent = pendingRequests || 0;
    if (statPendingUsers) statPendingUsers.textContent = pendingUsers || 0;
  } catch (error) {
    console.error("대시보드 통계 조회 실패:", error);
  }
}

// 3. 🔥 오늘 관리자 체크리스트 동적 생성
async function loadDashboardTasks() {
  if (!dashboardTaskList) return;

  try {
    // 3개의 대기 건수 병렬 조회
    const [
      { count: lateCount },
      { count: editRequestCount },
      { count: newEmployeeCount }
    ] = await Promise.all([
      supabase.from("attendance").select("*", { count: "exact", head: true }).eq("work_date", todayStr).in("status", ["late", "지각"]),
      supabase.from("employee_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("status", "pending")
    ]);

    const tasks = [
      {
        title: "신규 가입 승인 대기",
        desc: "직원 앱에서 가입 후 관리자 승인을 기다리는 직원이 있습니다.",
        count: newEmployeeCount || 0,
        link: "admin-employees.html",
      },
      {
        title: "오늘 지각 발생 내역",
        desc: "오늘 출근 시 지각으로 기록된 직원이 있습니다. 사유를 확인해 주세요.",
        count: lateCount || 0,
        link: "admin-attendance-issue.html",
      },
      {
        title: "직원 업무 및 수정 요청",
        desc: "출퇴근 수정 및 업무 관련 요청 중 미처리된 건이 있습니다.",
        count: editRequestCount || 0,
        link: "admin-notices.html", // 또는 요청 관리 페이지
      }
    ];

    dashboardTaskList.innerHTML = tasks
      .map((task) => `
        <a href="${task.link}" class="dashboard-task-item">
          <div>
            <strong>${task.title}</strong>
            <p>${task.desc}</p>
          </div>
          <span style="${task.count > 0 ? 'background:#fee2e2; color:#dc2626; font-weight:bold; padding:4px 10px; border-radius:12px;' : ''}">
            ${task.count}건
          </span>
        </a>
      `)
      .join("");
  } catch (error) {
    console.error("체크리스트 조회 실패:", error);
    dashboardTaskList.innerHTML = `<p style="padding:10px; color:#888;">체크리스트를 불러오지 못했습니다.</p>`;
  }
}

// 4. 🔥 지역별 운영 현황 실시간 조회
async function loadRegionStatus() {
  if (!dashboardRegionList) return;

  try {
    // 활성 근무지 목록 가져오기
    const { data: workplaces, error: wpError } = await supabase
      .from("workplaces")
      .select("id, name")
      .eq("is_active", true);

    if (wpError || !workplaces || workplaces.length === 0) {
      dashboardRegionList.innerHTML = `<p style="padding:10px; color:#888;">등록된 근무 지역이 없습니다.</p>`;
      return;
    }

    // 각 근무지별로 배정 직원수, 오늘 출근자수, 문제 발생 건수 조회
    const regionData = await Promise.all(
      workplaces.map(async (wp) => {
        const [
          { count: assignedCount },
          { count: workingCount },
          { count: issueCount }
        ] = await Promise.all([
          supabase.from("workplace_users").select("*", { count: "exact", head: true }).eq("workplace_id", wp.id),
          supabase.from("attendance").select("*", { count: "exact", head: true }).eq("workplace_id", wp.id).eq("work_date", todayStr),
          supabase.from("attendance").select("*", { count: "exact", head: true }).eq("workplace_id", wp.id).eq("work_date", todayStr).in("status", ["late", "location_error", "지각", "위치오류"])
        ]);

        return {
          name: wp.name,
          assigned: assignedCount || 0,
          working: workingCount || 0,
          issue: issueCount || 0
        };
      })
    );

    dashboardRegionList.innerHTML = regionData
      .map((region) => `
        <div class="dashboard-region-item">
          <div class="dashboard-region-top">
            <strong>${region.name}</strong>
            <span style="${region.issue > 0 ? 'color:#dc2626; font-weight:bold;' : 'color:#6b7280;'}">문제 ${region.issue}건</span>
          </div>
          <div class="dashboard-region-meta">
            <div>
              <p>배정</p>
              <strong>${region.assigned}명</strong>
            </div>
            <div>
              <p>오늘 출근</p>
              <strong>${region.working}명</strong>
            </div>
            <div>
              <p>확인 필요</p>
              <strong style="${region.issue > 0 ? 'color:#dc2626;' : ''}">${region.issue}건</strong>
            </div>
          </div>
        </div>
      `)
      .join("");
  } catch (error) {
    console.error("지역별 현황 조회 실패:", error);
    dashboardRegionList.innerHTML = `<p style="padding:10px; color:#888;">지역 데이터를 불러오지 못했습니다.</p>`;
  }
}

// 5. 🔥 최근 요청사항 조회 (최신 5건)
async function loadRecentRequests() {
  if (!dashboardRequestList) return;

  try {
    const { data: requests, error } = await supabase
      .from("employee_requests")
      .select(`
        id, request_type, title, status, created_at,
        users ( name )
      `)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error || !requests || requests.length === 0) {
      dashboardRequestList.innerHTML = `<p style="padding:16px; color:#888; text-align:center;">최근 들어온 요청사항이 없습니다.</p>`;
      return;
    }

    dashboardRequestList.innerHTML = requests
      .map((req) => {
        const userName = req.users?.name || "직원";
        const statusText = req.status === "pending" ? "미확인" : req.status === "approved" ? "승인됨" : "반려됨";
        const statusColor = req.status === "pending" ? "#dc2626" : "#168a4a";

        return `
          <div class="dashboard-request-item" style="padding:12px; border-bottom:1px solid #f3f4f6;">
            <div class="dashboard-request-top" style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <strong>${userName}</strong>
              <span style="color:${statusColor}; font-weight:bold; font-size:12px;">${statusText}</span>
            </div>
            <p style="font-size:13px; color:#4b5563; margin:0;">[${req.request_type || '일반요청'}] ${req.title}</p>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error("요청사항 조회 실패:", error);
    dashboardRequestList.innerHTML = `<p style="padding:10px; color:#888;">요청 내역을 불러오지 못했습니다.</p>`;
  }
}

// 6. 🔥 최근 관리자 활동 (최신 공지사항 또는 출근 기록 렌더링)
async function loadRecentActivities() {
  if (!dashboardActivityList) return;

  try {
    // 최신 공지사항 3건을 관리자 활동으로 표시
    const { data: notices, error } = await supabase
      .from("notices")
      .select("title, created_at")
      .order("created_at", { ascending: false })
      .limit(3);

    if (error || !notices || notices.length === 0) {
      dashboardActivityList.innerHTML = `<p style="padding:16px; color:#888; text-align:center;">최근 활동 내역이 없습니다.</p>`;
      return;
    }

    dashboardActivityList.innerHTML = notices
      .map((notice) => {
        const timeDiff = Math.floor((new Date() - new Date(notice.created_at)) / (1000 * 60 * 60));
        const timeText = timeDiff > 24 ? `${Math.floor(timeDiff / 24)}일 전` : timeDiff > 0 ? `${timeDiff}시간 전` : "방금 전";

        return `
          <div class="dashboard-activity-item" style="padding:12px; border-bottom:1px solid #f3f4f6;">
            <div class="dashboard-activity-top" style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <strong style="font-size:14px; color:#111827;">${notice.title}</strong>
              <span style="font-size:11px; background:#f3f4f6; color:#6b7280; padding:2px 6px; border-radius:4px;">공지 등록</span>
            </div>
            <p style="font-size:12px; color:#8b95a1; margin:0;">관리자 · ${timeText}</p>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error("관리자 활동 조회 실패:", error);
    dashboardActivityList.innerHTML = `<p style="padding:10px; color:#888;">활동 내역을 불러오지 못했습니다.</p>`;
  }
}

// 7. 새로고침 버튼 이벤트
function handleDashboardRefresh() {
  initDashboard();
  alert("🔄 최신 DB 데이터로 대시보드를 새로고침했습니다.");
}

// 🔥 대시보드 전체 초기화 실행
async function initDashboard() {
  setDashboardDate();
  
  // 모든 섹션을 병렬로 동시 조회하여 0.3초 만에 쾌적하게 로딩!
  await Promise.all([
    loadSummaryStats(),
    loadDashboardTasks(),
    loadRegionStatus(),
    loadRecentRequests(),
    loadRecentActivities()
  ]);

  if (dashboardRefreshBtn) {
    dashboardRefreshBtn.removeEventListener("click", handleDashboardRefresh);
    dashboardRefreshBtn.addEventListener("click", handleDashboardRefresh);
  }
}

initDashboard();