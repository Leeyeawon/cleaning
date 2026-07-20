import supabase from "./supabase.js";
import {
  requireAdmin,
} from "./adminAuth.js";

const dashboardDate =
  document.getElementById(
    "dashboardDate"
  );

const dashboardHeroTitle =
  document.getElementById(
    "dashboardHeroTitle"
  );

const dashboardHeroDescription =
  document.getElementById(
    "dashboardHeroDescription"
  );

const dashboardTaskList =
  document.getElementById(
    "dashboardTaskList"
  );

const dashboardRegionList =
  document.getElementById(
    "dashboardRegionList"
  );

const dashboardRequestList =
  document.getElementById(
    "dashboardRequestList"
  );

const dashboardActivityList =
  document.getElementById(
    "dashboardActivityList"
  );

const dashboardRefreshBtn =
  document.getElementById(
    "dashboardRefreshBtn"
  );

const statTotalEmployees =
  document.getElementById(
    "statTotalEmployees"
  );

const statActiveWorkplaces =
  document.getElementById(
    "statActiveWorkplaces"
  );

const statTodayIssues =
  document.getElementById(
    "statTodayIssues"
  );

const statPendingRequests =
  document.getElementById(
    "statPendingRequests"
  );

const statPendingUsers =
  document.getElementById(
    "statPendingUsers"
  );

let dashboardData = {
  users: [],
  workplaces: [],
  assignments: [],
  attendance: [],
  leave: [],
  requests: [],
  notices: [],
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getLocalDateKey(
  date = new Date()
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function setDashboardDate() {
  if (!dashboardDate) {
    return;
  }

  const formattedDate =
    new Date().toLocaleDateString(
      "ko-KR",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      }
    );

  dashboardDate.textContent =
    `${formattedDate} 관리자 운영 현황입니다.`;
}

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");
}

function isLateStatus(status) {
  const value =
    normalizeStatus(status);

  return (
    value === "late" ||
    value === "지각"
  );
}

function isLocationErrorStatus(
  status
) {
  const value =
    normalizeStatus(status);

  return (
    value === "location_error" ||
    value === "위치오류" ||
    value === "위치_오류"
  );
}

function getRequestTypeLabel(type) {
  const labels = {
    annual_leave: "연차 신청",
    supply_request: "비품 요청",
    general_request: "요청 사항",
    phone_change: "연락처 변경",
    profile_change: "정보 변경",
  };

  return labels[type] || "기타 요청";
}

function getRequestStatus(request) {
  const labels = {
    pending: {
      text: "승인 대기",
      background: "#fff4df",
      color: "#b45309",
    },

    approved: {
      text: "승인 완료",
      background: "#e8f7ef",
      color: "#168a4a",
    },

    rejected: {
      text: "반려",
      background: "#fee2e2",
      color: "#dc2626",
    },
  };

  return (
    labels[request.status] || {
      text: request.status || "-",
      background: "#f3f4f6",
      color: "#6b7280",
    }
  );
}

function formatRelativeTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const difference =
    Date.now() - date.getTime();

  const minutes =
    Math.max(
      0,
      Math.floor(
        difference / 60000
      )
    );

  if (minutes < 1) {
    return "방금 전";
  }

  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}시간 전`;
  }

  const days =
    Math.floor(hours / 24);

  if (days < 30) {
    return `${days}일 전`;
  }

  return date.toLocaleDateString(
    "ko-KR"
  );
}

async function fetchDashboardData() {
  const today =
    getLocalDateKey();

  const results =
    await Promise.all([
      supabase
        .from("users")
        .select(`
          id,
          name,
          department,
          status,
          app_approval_status
        `),

      supabase
        .from("workplaces")
        .select("id, name")
        .order("name"),

      supabase
        .from("workplace_users")
        .select(
          "workplace_id, user_id"
        ),

      supabase
        .from("attendance")
        .select(`
          id,
          user_id,
          workplace_id,
          work_date,
          check_in_time,
          check_out_time,
          status
        `)
        .eq("work_date", today),

      supabase
        .from(
          "employee_daily_notes"
        )
        .select(
          "user_id, note_date, day_type"
        )
        .eq("note_date", today)
        .eq(
          "day_type",
          "annual_leave"
        ),

      supabase.rpc(
        "admin_get_employee_requests"
      ),

      supabase
        .from("notices")
        .select(`
          id,
          title,
          status,
          important,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(5),
    ]);

  const failedResult =
    results.find(
      (result) => result.error
    );

  if (failedResult) {
    throw failedResult.error;
  }

  dashboardData = {
    users: results[0].data || [],
    workplaces:
      results[1].data || [],
    assignments:
      results[2].data || [],
    attendance:
      results[3].data || [],
    leave: results[4].data || [],
    requests:
      results[5].data || [],
    notices:
      results[6].data || [],
  };
}

function getCalculatedData() {
  const activeUsers =
    dashboardData.users.filter(
      (user) =>
        user.status === "active"
    );

  const pendingUsers =
    dashboardData.users.filter(
      (user) =>
        user.status !== "deleted" &&
        user.app_approval_status ===
          "pending"
    );

  const pendingRequests =
    dashboardData.requests.filter(
      (request) =>
        request.status === "pending"
    );

  const leaveUserIds =
    new Set(
      dashboardData.leave.map(
        (item) =>
          String(item.user_id)
      )
    );

  const attendedUserIds =
    new Set(
      dashboardData.attendance.map(
        (item) =>
          String(item.user_id)
      )
    );

  const lateRecords =
    dashboardData.attendance.filter(
      (record) =>
        isLateStatus(record.status)
    );

  const locationErrorRecords =
    dashboardData.attendance.filter(
      (record) =>
        isLocationErrorStatus(
          record.status
        )
    );

  const absentUsers =
    activeUsers.filter((user) => {
      const userId =
        String(user.id);

      return (
        !attendedUserIds.has(userId) &&
        !leaveUserIds.has(userId)
      );
    });

  const todayIssueCount =
    lateRecords.length +
    locationErrorRecords.length +
    absentUsers.length;

  return {
    activeUsers,
    pendingUsers,
    pendingRequests,
    leaveUserIds,
    attendedUserIds,
    lateRecords,
    locationErrorRecords,
    absentUsers,
    todayIssueCount,
  };
}

function renderSummary(calculated) {
  statTotalEmployees.textContent =
    calculated.activeUsers.length;

  statActiveWorkplaces.textContent =
    dashboardData.workplaces.length;

  statTodayIssues.textContent =
    calculated.todayIssueCount;

  statPendingRequests.textContent =
    calculated.pendingRequests.length;

  statPendingUsers.textContent =
    calculated.pendingUsers.length;
}

function renderHero(calculated) {
  const totalTasks =
    calculated.todayIssueCount +
    calculated.pendingRequests.length +
    calculated.pendingUsers.length;

  if (totalTasks === 0) {
    dashboardHeroTitle.textContent =
      "현재 처리해야 할 업무가 없습니다.";

    dashboardHeroDescription.textContent =
      "출퇴근 문제와 승인 대기 요청이 모두 처리되었습니다.";

    return;
  }

  dashboardHeroTitle.textContent =
    `처리해야 할 업무가 ${totalTasks}건 있습니다.`;

  dashboardHeroDescription.textContent =
    `출퇴근 확인 ${calculated.todayIssueCount}건 · ` +
    `직원 요청 ${calculated.pendingRequests.length}건 · ` +
    `앱 승인 ${calculated.pendingUsers.length}건`;
}

function renderTasks(calculated) {
  const attendanceDescription =
    `미출근 ${calculated.absentUsers.length}명, ` +
    `지각 ${calculated.lateRecords.length}건, ` +
    `위치 오류 ${calculated.locationErrorRecords.length}건입니다.`;

  const tasks = [
    {
      title: "앱 로그인 승인 대기",
      description:
        "앱 로그인을 요청한 직원의 이용을 승인해 주세요.",
      count:
        calculated.pendingUsers.length,
      unit: "명",
      href: "admin-employees.html",
    },

    {
      title: "오늘 출퇴근 확인",
      description:
        attendanceDescription,
      count:
        calculated.todayIssueCount,
      unit: "건",
      href:
        "admin-attendance-issue.html",
    },

    {
      title: "직원 요청 승인 대기",
      description:
        "연차, 비품, 연락처 및 일반 요청을 확인해 주세요.",
      count:
        calculated.pendingRequests.length,
      unit: "건",
      href: "admin-requests.html",
    },
  ];

  dashboardTaskList.innerHTML =
    tasks
      .map((task) => {
        const badgeStyle =
          task.count > 0
            ? `
              background:#fee2e2;
              color:#dc2626;
              font-weight:700;
              padding:4px 10px;
              border-radius:9999px;
            `
            : `
              background:#f3f4f6;
              color:#737373;
              padding:4px 10px;
              border-radius:9999px;
            `;

        return `
          <a
            href="${task.href}"
            class="dashboard-task-item"
          >
            <div>
              <strong>
                ${escapeHtml(task.title)}
              </strong>

              <p>
                ${escapeHtml(
                  task.description
                )}
              </p>
            </div>

            <span style="${badgeStyle}">
              ${task.count}${task.unit}
            </span>
          </a>
        `;
      })
      .join("");
}

function renderRegions(calculated) {
  if (
    dashboardData.workplaces.length === 0
  ) {
    dashboardRegionList.innerHTML = `
      <p style="padding:16px; color:#737373;">
        등록된 근무 지역이 없습니다.
      </p>
    `;

    return;
  }

  const activeUserIds =
    new Set(
      calculated.activeUsers.map(
        (user) => String(user.id)
      )
    );

  dashboardRegionList.innerHTML =
    dashboardData.workplaces
      .map((workplace) => {
        const workplaceId =
          String(workplace.id);

        const assignedUserIds =
          new Set(
            dashboardData.assignments
              .filter(
                (assignment) =>
                  String(
                    assignment.workplace_id
                  ) === workplaceId &&
                  activeUserIds.has(
                    String(
                      assignment.user_id
                    )
                  )
              )
              .map(
                (assignment) =>
                  String(
                    assignment.user_id
                  )
              )
          );

        const workplaceAttendance =
          dashboardData.attendance.filter(
            (record) =>
              String(
                record.workplace_id
              ) === workplaceId
          );

        const workingUserIds =
          new Set(
            workplaceAttendance.map(
              (record) =>
                String(record.user_id)
            )
          );

        const attendanceIssues =
          workplaceAttendance.filter(
            (record) =>
              isLateStatus(
                record.status
              ) ||
              isLocationErrorStatus(
                record.status
              )
          ).length;

        const absentCount =
          [...assignedUserIds].filter(
            (userId) =>
              !calculated
                .attendedUserIds
                .has(userId) &&
              !calculated
                .leaveUserIds
                .has(userId)
          ).length;

        const issueCount =
          attendanceIssues +
          absentCount;

        return `
          <div
            class="dashboard-region-item"
          >
            <div
              class="dashboard-region-top"
            >
              <strong>
                ${escapeHtml(
                  workplace.name
                )}
              </strong>

              <span
                style="
                  background:${
                    issueCount > 0
                      ? "#fee2e2"
                      : "#f3f4f6"
                  };
                  color:${
                    issueCount > 0
                      ? "#dc2626"
                      : "#737373"
                  };
                "
              >
                확인 ${issueCount}건
              </span>
            </div>

            <div
              class="dashboard-region-meta"
            >
              <div>
                <p>배정</p>
                <strong>
                  ${assignedUserIds.size}명
                </strong>
              </div>

              <div>
                <p>오늘 출근</p>
                <strong>
                  ${workingUserIds.size}명
                </strong>
              </div>

              <div>
                <p>미출근</p>
                <strong
                  style="
                    color:${
                      absentCount > 0
                        ? "#dc2626"
                        : "#171717"
                    };
                  "
                >
                  ${absentCount}명
                </strong>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
}

function renderRecentRequests() {
  const requests =
    [...dashboardData.requests]
      .sort(
        (first, second) =>
          new Date(
            second.created_at
          ) -
          new Date(
            first.created_at
          )
      )
      .slice(0, 5);

  if (requests.length === 0) {
    dashboardRequestList.innerHTML = `
      <p
        style="
          padding:16px;
          color:#737373;
          text-align:center;
        "
      >
        최근 요청사항이 없습니다.
      </p>
    `;

    return;
  }

  dashboardRequestList.innerHTML =
    requests
      .map((request) => {
        const status =
          getRequestStatus(request);

        let requestTitle =
          request.title || "요청";

        if (
          request.request_type ===
          "annual_leave"
        ) {
          requestTitle =
            request.start_date ===
            request.end_date
              ? request.start_date
              : `${request.start_date} ~ ${request.end_date}`;
        }

        return `
          <a
            href="admin-requests.html"
            class="dashboard-request-item"
            style="
              text-decoration:none;
              color:inherit;
            "
          >
            <div
              class="dashboard-request-top"
            >
              <strong>
                ${escapeHtml(
                  request.user_name ||
                    "직원"
                )}
              </strong>

              <span
                style="
                  background:${status.background};
                  color:${status.color};
                "
              >
                ${escapeHtml(status.text)}
              </span>
            </div>

            <p>
              ${escapeHtml(
                getRequestTypeLabel(
                  request.request_type
                )
              )}
              ·
              ${escapeHtml(requestTitle)}
            </p>
          </a>
        `;
      })
      .join("");
}

function renderRecentActivities() {
  if (
    dashboardData.notices.length === 0
  ) {
    dashboardActivityList.innerHTML = `
      <p
        style="
          padding:16px;
          color:#737373;
        "
      >
        최근 등록된 공지가 없습니다.
      </p>
    `;

    return;
  }

  dashboardActivityList.innerHTML =
    dashboardData.notices
      .slice(0, 3)
      .map((notice) => {
        const status =
          notice.status || "저장됨";

        return `
          <a
            href="admin-notices.html"
            class="dashboard-activity-item"
            style="
              text-decoration:none;
              color:inherit;
            "
          >
            <div
              class="dashboard-activity-top"
            >
              <strong>
                ${notice.important
                  ? "중요 · "
                  : ""}
                ${escapeHtml(
                  notice.title
                )}
              </strong>

              <span>
                ${escapeHtml(status)}
              </span>
            </div>

            <p>
              공지 등록 ·
              ${formatRelativeTime(
                notice.created_at
              )}
            </p>
          </a>
        `;
      })
      .join("");
}

function renderLoadFailure(error) {
  console.error(
    "관리자 대시보드 조회 실패:",
    error
  );

  dashboardHeroTitle.textContent =
    "운영 현황을 불러오지 못했습니다.";

  dashboardHeroDescription.textContent =
    error.message ||
    "Supabase 연결과 관리자 권한을 확인해 주세요.";

  const failureMessage = `
    <p style="padding:16px; color:#dc2626;">
      데이터를 불러오지 못했습니다.
    </p>
  `;

  dashboardTaskList.innerHTML =
    failureMessage;

  dashboardRegionList.innerHTML =
    failureMessage;

  dashboardRequestList.innerHTML =
    failureMessage;

  dashboardActivityList.innerHTML =
    failureMessage;
}

async function loadDashboard() {
  if (dashboardRefreshBtn) {
    dashboardRefreshBtn.disabled = true;
    dashboardRefreshBtn.textContent =
      "불러오는 중...";
  }

  try {
    await fetchDashboardData();

    const calculated =
      getCalculatedData();

    renderSummary(calculated);
    renderHero(calculated);
    renderTasks(calculated);
    renderRegions(calculated);
    renderRecentRequests();
    renderRecentActivities();
  } catch (error) {
    renderLoadFailure(error);
  } finally {
    if (dashboardRefreshBtn) {
      dashboardRefreshBtn.disabled =
        false;

      dashboardRefreshBtn.textContent =
        "새로고침";
    }
  }
}

async function initDashboard() {
  const admin =
    await requireAdmin();

  if (!admin) {
    return;
  }

  setDashboardDate();

  dashboardRefreshBtn?.addEventListener(
    "click",
    loadDashboard
  );

  await loadDashboard();
}

initDashboard();