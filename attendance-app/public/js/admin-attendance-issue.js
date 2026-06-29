/* =========================
  지각·미출근 관리 페이지
========================= */

const lateEmployees = [
  {
    name: "박서연",
    region: "서면 B구역",
    scheduledTime: "09:00",
    actualTime: "09:18",
    lateMinutes: "18분",
    monthlyLateCount: 5,
    reason: "미확인",
    memo: "",
  },
  {
    name: "정하윤",
    region: "해운대 A구역",
    scheduledTime: "09:00",
    actualTime: "09:11",
    lateMinutes: "11분",
    monthlyLateCount: 4,
    reason: "교통 지연",
    memo: "버스 배차 지연",
  },
  {
    name: "한지우",
    region: "남포동 C구역",
    scheduledTime: "09:00",
    actualTime: "09:07",
    lateMinutes: "7분",
    monthlyLateCount: 3,
    reason: "관리자 확인",
    memo: "현장 이동 후 출근 처리",
  },
];

const absentEmployees = [
  {
    name: "최준혁",
    region: "남포동 C구역",
    scheduledTime: "09:00",
    phone: "010-0000-0000",
    status: "미확인",
  },
  {
    name: "김다은",
    region: "해운대 A구역",
    scheduledTime: "09:00",
    phone: "010-0000-0000",
    status: "연락 완료",
  },
];

const locationErrors = [
  {
    name: "이민준",
    region: "서면 B구역",
    time: "08:58",
    distance: "320m",
    status: "확인 필요",
  },
];

let selectedLateIndex = null;

const todayDate = document.getElementById("todayDate");
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

function getReasonBadgeClass(reason) {
  if (reason === "미확인") return "unchecked";
  if (reason === "기타 직접 입력") return "input";
  return "checked";
}

function renderLateTable() {
  if (!lateTableBody) return;

  lateTableBody.innerHTML = lateEmployees
    .map((employee, index) => {
      return `
        <tr>
          <td>
            <div class="employee">
              <span class="avatar">${employee.name.slice(0, 1)}</span>
              ${employee.name}
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
            <button class="table-action-btn" type="button" onclick="openReasonModal(${index})">
              사유 기입
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderAbsentTable() {
  if (!absentTableBody) return;

  absentTableBody.innerHTML = absentEmployees
    .map((employee) => {
      return `
        <tr>
          <td>
            <div class="employee">
              <span class="avatar">${employee.name.slice(0, 1)}</span>
              ${employee.name}
            </div>
          </td>
          <td>${employee.region}</td>
          <td>${employee.scheduledTime}</td>
          <td>${employee.phone}</td>
          <td>
            <select>
              <option ${employee.status === "미확인" ? "selected" : ""}>미확인</option>
              <option ${employee.status === "연락 완료" ? "selected" : ""}>연락 완료</option>
              <option ${employee.status === "사유 확인" ? "selected" : ""}>사유 확인</option>
              <option ${employee.status === "무단 미출근" ? "selected" : ""}>무단 미출근</option>
              <option ${employee.status === "관리자 처리" ? "selected" : ""}>관리자 처리</option>
            </select>
          </td>
          <td>
            <button class="table-action-btn" type="button">상세</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderRepeatLateList() {
  if (!repeatLateList) return;

  repeatLateList.innerHTML = lateEmployees
    .filter((employee) => employee.monthlyLateCount >= 3)
    .map((employee) => {
      return `
        <div class="repeat-late-item">
          <div class="repeat-late-item-top">
            <strong>${employee.name}</strong>
            <span>${employee.monthlyLateCount}회</span>
          </div>
          <p>${employee.region} · 최근 사유: ${employee.reason}</p>
        </div>
      `;
    })
    .join("");
}

function renderLocationErrors() {
  if (!locationErrorList) return;

  locationErrorList.innerHTML = locationErrors
    .map((error) => {
      return `
        <div class="location-error-item">
          <div class="location-error-item-top">
            <strong>${error.name}</strong>
            <span>${error.status}</span>
          </div>
          <p>${error.region} · ${error.time} · 지정 위치와 ${error.distance} 차이</p>
        </div>
      `;
    })
    .join("");
}

function openReasonModal(index) {
  selectedLateIndex = index;

  const employee = lateEmployees[index];

  modalEmployeeName.textContent = employee.name;
  modalEmployeeInfo.textContent = `${employee.region} · ${employee.lateMinutes} 지각`;
  reasonSelect.value = employee.reason;
  reasonMemo.value = employee.memo;

  reasonModal.classList.add("open");
}

function closeReasonModal() {
  selectedLateIndex = null;
  reasonModal.classList.remove("open");
}

function saveReason() {
  if (selectedLateIndex === null) return;

  lateEmployees[selectedLateIndex].reason = reasonSelect.value;
  lateEmployees[selectedLateIndex].memo = reasonMemo.value.trim();

  renderLateTable();
  renderRepeatLateList();
  closeReasonModal();
}

function initIssuePage() {
  setTodayText();
  renderLateTable();
  renderAbsentTable();
  renderRepeatLateList();
  renderLocationErrors();

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

initIssuePage();