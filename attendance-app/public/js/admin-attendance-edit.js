/* =========================
  출퇴근 기록 수정 페이지
========================= */

const editRecords = [
  {
    name: "박서연",
    date: "2026.06.29",
    type: "퇴근 누락",
    checkIn: "09:18",
    checkOut: "—",
    status: "수정 필요",
    statusType: "late",
    reason: "직원 퇴근 누락",
    memo: "",
  },
  {
    name: "정하윤",
    date: "2026.06.29",
    type: "출근 누락",
    checkIn: "—",
    checkOut: "18:03",
    status: "수정 필요",
    statusType: "late",
    reason: "직원 출근 누락",
    memo: "",
  },
  {
    name: "한지우",
    date: "2026.06.29",
    type: "위치 오류",
    checkIn: "08:58",
    checkOut: "18:04",
    status: "수정 필요",
    statusType: "location",
    reason: "GPS 오류",
    memo: "지정 위치와 320m 차이",
  },
  {
    name: "이민준",
    date: "2026.06.28",
    type: "시간 조정",
    checkIn: "09:02",
    checkOut: "18:00",
    status: "수정 완료",
    statusType: "normal",
    reason: "관리자 확인 완료",
    memo: "현장 담당자 확인 후 퇴근 시간 수정",
  },
];

const editHistories = [
  {
    name: "이민준",
    changed: "퇴근 17:50 → 18:00",
    reason: "관리자 확인 완료",
    admin: "김관리자",
  },
  {
    name: "김다은",
    changed: "출근 없음 → 08:57",
    reason: "직원 출근 누락",
    admin: "김관리자",
  },
  {
    name: "최준혁",
    changed: "상태 수정 필요 → 수정 완료",
    reason: "GPS 오류",
    admin: "김관리자",
  },
];

let selectedEditIndex = null;

const editTableBody = document.getElementById("editTableBody");
const editTypeFilter = document.getElementById("editTypeFilter");
const editStatusFilter = document.getElementById("editStatusFilter");
const editSearchInput = document.getElementById("editSearchInput");
const editHistoryList = document.getElementById("editHistoryList");

const editModal = document.getElementById("editModal");
const editModalCloseBtn = document.getElementById("editModalCloseBtn");
const editModalCancelBtn = document.getElementById("editModalCancelBtn");
const editSaveBtn = document.getElementById("editSaveBtn");

const editModalEmployeeName = document.getElementById("editModalEmployeeName");
const editModalEmployeeInfo = document.getElementById("editModalEmployeeInfo");
const editCheckInInput = document.getElementById("editCheckInInput");
const editCheckOutInput = document.getElementById("editCheckOutInput");
const editRecordStatusSelect = document.getElementById("editRecordStatusSelect");
const editReasonSelect = document.getElementById("editReasonSelect");
const editMemoInput = document.getElementById("editMemoInput");

function getStatusClass(statusType) {
  if (statusType === "late") return "late";
  if (statusType === "absent") return "absent";
  if (statusType === "location") return "location";
  return "normal";
}

function timeToInputValue(time) {
  if (time === "—") return "";
  return time;
}

function inputValueToTime(value) {
  if (!value) return "—";
  return value;
}

function filterEditRecords() {
  const selectedType = editTypeFilter ? editTypeFilter.value : "all";
  const selectedStatus = editStatusFilter ? editStatusFilter.value : "all";
  const searchKeyword = editSearchInput ? editSearchInput.value.trim() : "";

  return editRecords.filter((record) => {
    const typeMatched = selectedType === "all" || record.type === selectedType;
    const statusMatched =
      selectedStatus === "all" || record.status === selectedStatus;
    const searchMatched =
      searchKeyword === "" || record.name.includes(searchKeyword);

    return typeMatched && statusMatched && searchMatched;
  });
}

function renderEditTable(records) {
  if (!editTableBody) return;

  if (records.length === 0) {
    editTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">조회된 수정 대상 기록이 없습니다.</td>
      </tr>
    `;
    return;
  }

  editTableBody.innerHTML = records
    .map((record) => {
      const originalIndex = editRecords.indexOf(record);

      return `
        <tr>
          <td>
            <div class="employee">
              <span class="avatar">${record.name.slice(0, 1)}</span>
              ${record.name}
            </div>
          </td>
          <td>${record.date}</td>
          <td>
            <span class="edit-type-badge">${record.type}</span>
          </td>
          <td>${record.checkIn}</td>
          <td>${record.checkOut}</td>
          <td>
            <span class="status ${getStatusClass(record.statusType)}">
              ${record.status}
            </span>
          </td>
          <td>
            <button class="table-action-btn" type="button" onclick="openEditModal(${originalIndex})">
              수정
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderEditHistories() {
  if (!editHistoryList) return;

  editHistoryList.innerHTML = editHistories
    .map((history) => {
      return `
        <div class="edit-history-item">
          <strong>${history.name}</strong>
          <p>${history.changed}</p>
          <span>${history.reason}</span>
          <p>수정자: ${history.admin}</p>
        </div>
      `;
    })
    .join("");
}

function openEditModal(index) {
  selectedEditIndex = index;

  const record = editRecords[index];

  editModalEmployeeName.textContent = record.name;
  editModalEmployeeInfo.textContent = `${record.date} · ${record.type}`;

  editCheckInInput.value = timeToInputValue(record.checkIn);
  editCheckOutInput.value = timeToInputValue(record.checkOut);
  editRecordStatusSelect.value = record.status;
  editReasonSelect.value = record.reason;
  editMemoInput.value = record.memo;

  editModal.classList.add("open");
}

function closeEditModal() {
  selectedEditIndex = null;
  editModal.classList.remove("open");
}

function saveEditRecord() {
  if (selectedEditIndex === null) return;

  const record = editRecords[selectedEditIndex];

  const oldCheckIn = record.checkIn;
  const oldCheckOut = record.checkOut;
  const oldStatus = record.status;

  record.checkIn = inputValueToTime(editCheckInInput.value);
  record.checkOut = inputValueToTime(editCheckOutInput.value);
  record.status = editRecordStatusSelect.value;
  record.reason = editReasonSelect.value;
  record.memo = editMemoInput.value.trim();

  record.statusType = record.status === "수정 완료" ? "normal" : record.statusType;

  editHistories.unshift({
    name: record.name,
    changed: `출근 ${oldCheckIn} → ${record.checkIn}, 퇴근 ${oldCheckOut} → ${record.checkOut}`,
    reason: record.reason,
    admin: "김관리자",
  });

  updateEditPage();
  closeEditModal();
}

function updateEditPage() {
  const filteredRecords = filterEditRecords();
  renderEditTable(filteredRecords);
  renderEditHistories();
}

function initEditPage() {
  updateEditPage();

  if (editTypeFilter) {
    editTypeFilter.addEventListener("change", updateEditPage);
  }

  if (editStatusFilter) {
    editStatusFilter.addEventListener("change", updateEditPage);
  }

  if (editSearchInput) {
    editSearchInput.addEventListener("input", updateEditPage);
  }

  if (editModalCloseBtn) {
    editModalCloseBtn.addEventListener("click", closeEditModal);
  }

  if (editModalCancelBtn) {
    editModalCancelBtn.addEventListener("click", closeEditModal);
  }

  if (editSaveBtn) {
    editSaveBtn.addEventListener("click", saveEditRecord);
  }

  if (editModal) {
    editModal.addEventListener("click", (event) => {
      if (event.target === editModal) {
        closeEditModal();
      }
    });
  }
}

initEditPage();