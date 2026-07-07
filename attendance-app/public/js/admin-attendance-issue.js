/* =========================
  관리자 지각·미출근 관리
  Supabase 연동 버전
========================= */

import supabase from "./supabase.js";

const WORK_START_TIME = "09:00";

const todayDate = document.getElementById("todayDate");

const issueLateCount = document.getElementById("issueLateCount");
const issueAbsentCount = document.getElementById("issueAbsentCount");
const issueLocationCount = document.getElementById("issueLocationCount");
const issueRepeatLateCount = document.getElementById("issueRepeatLateCount");

const lateTableBody = document.getElementById("lateTableBody");
const absentTableBody = document.getElementById("absentTableBody");
const repeatLateList = document.getElementById("repeatLateList");
const locationErrorList = document.getElementById("locationErrorList");

const reasonModal = document.getElementById("reasonModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const reasonSaveBtn = document.getElementById("reasonSaveBtn");
const modalEmployeeName = document.getElementById("modalEmployeeName");
const modalEmployeeInfo = document.getElementById("modalEmployeeInfo");
const reasonSelect = document.getElementById("reasonSelect");
const reasonMemo = document.getElementById("reasonMemo");

const todayStr = new Date().toISOString().split("T")[0];

let lateEmployees = [];
let absentEmployees = [];
let locationErrors = [];
let selectedLateIndex = null;

function setTodayText() {
  if (!todayDate) return;

  const now = new Date();
  const formattedDate = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });

  todayDate.textContent = `${formattedDate} 지각, 미출근, 위치 오류 직원을 확인합니다.`;
}

function formatTime(timeString) {
  if (!timeString) return "—";

  const date = new Date(timeString);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMinutesLate(checkInTime) {
  if (!checkInTime) return 0;

  const checkInDate = new Date(checkInTime);
  if (Number.isNaN(checkInDate.getTime())) return 0;

  const [hour, minute] = WORK_START_TIME.split(":").map(Number);
  const scheduledDate = new Date(checkInDate);
  scheduledDate.setHours(hour, minute, 0, 0);

  const diffMs = checkInDate - scheduledDate;
  const diffMinutes = Math.floor(diffMs / 1000 / 60);

  return Math.max(diffMinutes, 0);
}

function getReasonBadgeClass(reason) {
  if (!reason || reason === "미확인") return "unchecked";
  if (reason === "기타 직접 입력") return "input";
  return "checked";
}

function updateStats() {
  if (issueLateCount) issueLateCount.textContent = lateEmployees.length;
  if (issueAbsentCount) issueAbsentCount.textContent = absentEmployees.length;
  if (issueLocationCount) issueLocationCount.textContent = locationErrors.length;

  const repeatLateCount = lateEmployees.filter(
    (employee) => employee.monthlyLateCount >= 3
  ).length;

  if (issueRepeatLateCount) {
    issueRepeatLateCount.textContent = repeatLateCount;
  }
}

async function fetchIssueData() {
  const { data: allUsers, error: userError } = await supabase
    .from("users")
    .select("id, name, department, status")
    .eq("status", "active");

  const { data: attendanceData, error: attendanceError } = await supabase
    .from("attendance")
    .select(`
      id,
      user_id,
      work_date,
      check_in_time,
      check_out_time,
      status,
      users ( name, department ),
      workplaces ( name )
    `)
    .eq("work_date", todayStr);

  if (userError || attendanceError) {
    console.error("지각·미출근 데이터 조회 실패:", userError || attendanceError);
    lateEmployees = [];
    absentEmployees = [];
    locationErrors = [];
    return;
  }

  const checkedInUserIds = new Set(
    (attendanceData || []).map((item) => item.user_id)
  );

  lateEmployees = (attendanceData || [])
    .filter((item) => item.status === "late" || item.status === "지각")
    .map((item) => {
      const lateMinutes = getMinutesLate(item.check_in_time);

      return {
        attendanceId: item.id,
        userId: item.user_id,
        name: item.users?.name || "이름 없음",
        department: item.users?.department || "부서 없음",
        region: item.workplaces?.name || "미배정",
        scheduledTime: WORK_START_TIME,
        actualTime: formatTime(item.check_in_time),
        lateMinutes: `${lateMinutes}분`,
        monthlyLateCount: 1,
        reason: "미확인",
        memo: "",
      };
    });

  absentEmployees = (allUsers || [])
    .filter((user) => !checkedInUserIds.has(user.id))
    .map((user) => ({
      userId: user.id,
      name: user.name || "이름 없음",
      department: user.department || "부서 없음",
      region: "미출근",
      scheduledTime: WORK_START_TIME,
      phone: "—",
      status: "미확인",
    }));

  locationErrors = (attendanceData || [])
    .filter(
      (item) => item.status === "location_error" || item.status === "위치오류"
    )
    .map((item) => ({
      attendanceId: item.id,
      userId: item.user_id,
      name: item.users?.name || "이름 없음",
      region: item.workplaces?.name || "미배정",
      time: formatTime(item.check_in_time),
      distance: "확인 필요",
      status: "확인 필요",
    }));

  await applyMonthlyLateCount();
}

async function applyMonthlyLateCount() {
  const today = new Date();
  const firstDayOfMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  )
    .toISOString()
    .split("T")[0];

  const { data, error } = await supabase
    .from("attendance")
    .select("user_id")
    .gte("work_date", firstDayOfMonth)
    .lte("work_date", todayStr)
    .in("status", ["late", "지각"]);

  if (error || !data) {
    console.error("이번 달 지각 횟수 조회 실패:", error);
    return;
  }

  const countMap = new Map();

  data.forEach((item) => {
    countMap.set(item.user_id, (countMap.get(item.user_id) || 0) + 1);
  });

  lateEmployees = lateEmployees.map((employee) => ({
    ...employee,
    monthlyLateCount: countMap.get(employee.userId) || 1,
  }));
}

function renderLateTable() {
  if (!lateTableBody) return;

  if (lateEmployees.length === 0) {
    lateTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-row" style="text-align:center; padding:30px; color:#888;">
          오늘 지각 직원이 없습니다.
        </td>
      </tr>
    `;
    return;
  }

  lateTableBody.innerHTML = lateEmployees
    .map((employee, index) => {
      return `
        <tr>
          <td>
            <div class="employee">
              <div>
                <strong>${employee.name}</strong>
                <span style="display:block; font-size:11px; color:#888;">
                  ${employee.department}
                </span>
              </div>
            </div>
          </td>
          <td>${employee.region}</td>
          <td>${employee.scheduledTime}</td>
          <td>${employee.actualTime}</td>
          <td>${employee.lateMinutes}</td>
          <td>${employee.monthlyLateCount}회</td>
          <td>
            <span class="reason-badge ${getReasonBadgeClass(employee.reason)}">
              ${employee.reason}
            </span>
          </td>
          <td>
            <button class="table-action-btn" type="button" data-late-index="${index}">
              사유 기입
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  lateTableBody.querySelectorAll("[data-late-index]").forEach((button) => {
    button.addEventListener("click", () => {
      openReasonModal(Number(button.dataset.lateIndex));
    });
  });
}

function renderAbsentTable() {
  if (!absentTableBody) return;

  if (absentEmployees.length === 0) {
    absentTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row" style="text-align:center; padding:30px; color:#888;">
          오늘 미출근 직원이 없습니다.
        </td>
      </tr>
    `;
    return;
  }

  absentTableBody.innerHTML = absentEmployees
    .map((employee, index) => {
      return `
        <tr>
          <td>
            <div class="employee">
              <div>
                <strong>${employee.name}</strong>
                <span style="display:block; font-size:11px; color:#888;">
                  ${employee.department}
                </span>
              </div>
            </div>
          </td>
          <td>${employee.region}</td>
          <td>${employee.scheduledTime}</td>
          <td>${employee.phone}</td>
          <td>
            <select data-absent-index="${index}">
              <option ${employee.status === "미확인" ? "selected" : ""}>미확인</option>
              <option ${employee.status === "연락 완료" ? "selected" : ""}>연락 완료</option>
              <option ${employee.status === "사유 확인" ? "selected" : ""}>사유 확인</option>
              <option ${employee.status === "무단 미출근" ? "selected" : ""}>무단 미출근</option>
              <option ${employee.status === "관리자 처리" ? "selected" : ""}>관리자 처리</option>
            </select>
          </td>
          <td>
            <a href="admin-employee-detail.html?id=${employee.userId}" class="table-action-btn" style="text-decoration:none;">
              상세
            </a>
          </td>
        </tr>
      `;
    })
    .join("");

  absentTableBody.querySelectorAll("[data-absent-index]").forEach((select) => {
    select.addEventListener("change", () => {
      const index = Number(select.dataset.absentIndex);
      absentEmployees[index].status = select.value;
    });
  });
}

function renderRepeatLateList() {
  if (!repeatLateList) return;

  const repeatLateEmployees = lateEmployees
    .filter((employee) => employee.monthlyLateCount >= 3)
    .sort((a, b) => b.monthlyLateCount - a.monthlyLateCount);

  if (repeatLateEmployees.length === 0) {
    repeatLateList.innerHTML = `
      <p style="padding:16px; color:#888; text-align:center;">
        반복 지각 직원이 없습니다.
      </p>
    `;
    return;
  }

  repeatLateList.innerHTML = repeatLateEmployees
    .map((employee) => {
      return `
        <div class="repeat-late-item">
          <div class="repeat-late-item-top">
            <strong>${employee.name}</strong>
            <span>${employee.monthlyLateCount}회</span>
          </div>
          <p>${employee.department} · ${employee.region} · 최근 사유: ${employee.reason}</p>
        </div>
      `;
    })
    .join("");
}

function renderLocationErrors() {
  if (!locationErrorList) return;

  if (locationErrors.length === 0) {
    locationErrorList.innerHTML = `
      <p style="padding:16px; color:#888; text-align:center;">
        위치 오류 출근 시도가 없습니다.
      </p>
    `;
    return;
  }

  locationErrorList.innerHTML = locationErrors
    .map((error) => {
      return `
        <div class="location-error-item">
          <div class="location-error-item-top">
            <strong>${error.name}</strong>
            <span>${error.status}</span>
          </div>
          <p>${error.region} · ${error.time} · 지정 위치와 ${error.distance}</p>
        </div>
      `;
    })
    .join("");
}

function openReasonModal(index) {
  if (!reasonModal) return;

  selectedLateIndex = index;

  const employee = lateEmployees[index];
  if (!employee) return;

  modalEmployeeName.textContent = employee.name;
  modalEmployeeInfo.textContent = `${employee.region} · ${employee.lateMinutes} 지각`;
  reasonSelect.value = employee.reason;
  reasonMemo.value = employee.memo;

  reasonModal.classList.add("open");
}

function closeReasonModal() {
  selectedLateIndex = null;

  if (reasonModal) {
    reasonModal.classList.remove("open");
  }
}

function saveReason() {
  if (selectedLateIndex === null) return;

  lateEmployees[selectedLateIndex].reason = reasonSelect.value;
  lateEmployees[selectedLateIndex].memo = reasonMemo.value.trim();

  renderLateTable();
  renderRepeatLateList();
  closeReasonModal();
}

function bindEvents() {
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeReasonModal);
  }

  if (modalCancelBtn) {
    modalCancelBtn.addEventListener("click", closeReasonModal);
  }

  if (reasonSaveBtn) {
    reasonSaveBtn.addEventListener("click", saveReason);
  }

  if (reasonModal) {
    reasonModal.addEventListener("click", (event) => {
      if (event.target === reasonModal) {
        closeReasonModal();
      }
    });
  }
}

function renderAll() {
  updateStats();
  renderLateTable();
  renderAbsentTable();
  renderRepeatLateList();
  renderLocationErrors();
}

async function initIssuePage() {
  setTodayText();
  bindEvents();

  await fetchIssueData();
  renderAll();
}

initIssuePage();