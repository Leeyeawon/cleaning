/* =========================================================
  관리자 출퇴근 기록 수정
  - Supabase 출퇴근 기록 조회
  - 날짜 / 유형 / 상태 / 직원 검색
  - 출근·퇴근 시간 수정
  - 수정 이력 저장
  - 최근 수정 이력 조회
  - 엑셀 다운로드
========================================================= */

import supabase from "./supabase.js";

/* =========================
  DOM
========================= */

const editDateFilter =
  document.getElementById("editDateFilter");

const editTypeFilter =
  document.getElementById("editTypeFilter");

const editStatusFilter =
  document.getElementById("editStatusFilter");

const editSearchInput =
  document.getElementById("editSearchInput");

const editTableBody =
  document.getElementById("editTableBody");

const editHistoryList =
  document.getElementById("editHistoryList");

const editModal =
  document.getElementById("editModal");

const editModalCloseBtn =
  document.getElementById("editModalCloseBtn");

const editModalCancelBtn =
  document.getElementById("editModalCancelBtn");

const editSaveBtn =
  document.getElementById("editSaveBtn");

const editModalEmployeeName =
  document.getElementById("editModalEmployeeName");

const editModalEmployeeInfo =
  document.getElementById("editModalEmployeeInfo");

const editCheckInInput =
  document.getElementById("editCheckInInput");

const editCheckOutInput =
  document.getElementById("editCheckOutInput");

const editRecordStatusSelect =
  document.getElementById("editRecordStatusSelect");

const editReasonSelect =
  document.getElementById("editReasonSelect");

const editMemoInput =
  document.getElementById("editMemoInput");

const editRequiredCount =
  document.getElementById("editRequiredCount");

const missingCheckOutCount =
  document.getElementById("missingCheckOutCount");

const locationErrorCount =
  document.getElementById("locationErrorCount");

const todayEditedCount =
  document.getElementById("todayEditedCount");

const editHistoryDownloadBtn =
  document.getElementById("editHistoryDownloadBtn");

const editResetFilterBtn =
  document.getElementById("editResetFilterBtn");

/* =========================
  상태값
========================= */

let attendanceRecords = [];
let filteredRecords = [];
let editHistories = [];

let selectedRecordId = null;

/* =========================
  기본 함수
========================= */

function getTodayString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(dateString) {
  if (!dateString) {
    return "—";
  }

  const date = new Date(
    `${dateString}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(dateTimeString) {
  if (!dateTimeString) {
    return "—";
  }

  const date = new Date(dateTimeString);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatTime(dateTimeString) {
  if (!dateTimeString) {
    return "—";
  }

  const date = new Date(dateTimeString);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getTimeInputValue(dateTimeString) {
  if (!dateTimeString) {
    return "";
  }

  const date = new Date(dateTimeString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hour = String(
    date.getHours()
  ).padStart(2, "0");

  const minute = String(
    date.getMinutes()
  ).padStart(2, "0");

  return `${hour}:${minute}`;
}

/*
  한국 시간 기준으로 timestamptz 문자열 생성

  예:
  2026-07-10 + 09:00
  → 2026-07-10T09:00:00+09:00
*/
function createDateTimeValue(
  workDate,
  timeValue
) {
  if (!timeValue) {
    return null;
  }

  return `${workDate}T${timeValue}:00+09:00`;
}

function getStatusClass(statusType) {
  if (statusType === "late") {
    return "late";
  }

  if (statusType === "absent") {
    return "absent";
  }

  if (statusType === "location") {
    return "location";
  }

  return "normal";
}

/* =========================
  기록 유형 판단
========================= */

function getEditType(record) {
  if (
    !record.check_in_time &&
    record.check_out_time
  ) {
    return "출근 누락";
  }

  if (
    record.check_in_time &&
    !record.check_out_time
  ) {
    return "퇴근 누락";
  }

  const status = String(
    record.status || ""
  ).toLowerCase();

  if (
    status === "location_error" ||
    status === "location" ||
    status === "위치오류" ||
    status === "위치 오류"
  ) {
    return "위치 오류";
  }

  return "시간 조정";
}

function getStatusType(record) {
  const type = getEditType(record);

  if (type === "위치 오류") {
    return "location";
  }

  if (
    type === "출근 누락" ||
    type === "퇴근 누락"
  ) {
    return "late";
  }

  return "normal";
}

/* =========================
  수정 완료 여부

  해당 attendance_id의 수정 이력이 있으면
  수정 완료로 표시한다.
========================= */

function hasEditHistory(attendanceId) {
  return editHistories.some(
    (history) =>
      String(history.attendance_id) ===
      String(attendanceId)
  );
}

function getProcessingStatus(record) {
  return hasEditHistory(record.id)
    ? "수정 완료"
    : "수정 필요";
}

/* =========================
  관리자 이름

  프로젝트 로그인 정보가 localStorage에
  저장되어 있다면 해당 값을 사용한다.
========================= */

function getCurrentAdminName() {
  const possibleKeys = [
    "adminName",
    "userName",
    "employeeName",
    "currentUserName",
  ];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);

    if (value) {
      return value;
    }
  }

  return "관리자";
}

/* =========================
  출퇴근 기록 조회
========================= */

async function fetchAttendanceRecords() {
  const selectedDate =
    editDateFilter?.value ||
    getTodayString();

  const { data, error } = await supabase
    .from("attendance")
    .select(`
      id,
      user_id,
      work_date,
      check_in_time,
      check_out_time,
      status,
      users (
        id,
        name,
        department
      ),
      workplaces (
        id,
        name
      )
    `)
    .eq("work_date", selectedDate)
    .order("check_in_time", {
      ascending: true,
      nullsFirst: true,
    });

  if (error) {
    throw error;
  }

  attendanceRecords = data || [];
}

/* =========================
  수정 이력 조회
========================= */

async function fetchEditHistories() {
  const { data, error } = await supabase
    .from("attendance_edit_history")
    .select(`
      id,
      attendance_id,
      user_id,
      work_date,
      old_check_in_time,
      new_check_in_time,
      old_check_out_time,
      new_check_out_time,
      old_status,
      new_status,
      edit_type,
      edit_reason,
      memo,
      editor_name,
      created_at,
      users (
        id,
        name,
        department
      )
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  if (error) {
    throw error;
  }

  editHistories = data || [];
}

/* =========================
  필터
========================= */

function filterEditRecords() {
  const selectedType =
    editTypeFilter?.value || "all";

  const selectedStatus =
    editStatusFilter?.value || "all";

  const keyword =
    editSearchInput?.value
      .trim()
      .toLowerCase() || "";

  filteredRecords =
    attendanceRecords.filter((record) => {
      const type = getEditType(record);
      const processingStatus =
        getProcessingStatus(record);

      const employeeName = String(
        record.users?.name || ""
      ).toLowerCase();

      const department = String(
        record.users?.department || ""
      ).toLowerCase();

      const typeMatched =
        selectedType === "all" ||
        type === selectedType;

      const statusMatched =
        selectedStatus === "all" ||
        processingStatus === selectedStatus;

      const keywordMatched =
        !keyword ||
        employeeName.includes(keyword) ||
        department.includes(keyword);

      return (
        typeMatched &&
        statusMatched &&
        keywordMatched
      );
    });

  renderEditTable();
  updateStats();
}

/* =========================
  표 출력
========================= */

function renderEditTable() {
  if (!editTableBody) {
    return;
  }

  if (!filteredRecords.length) {
    editTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">
          조회된 출퇴근 기록이 없습니다.
        </td>
      </tr>
    `;

    return;
  }

  editTableBody.innerHTML =
    filteredRecords
      .map((record) => {
        const employeeName =
          record.users?.name ||
          "이름 없음";

        const department =
          record.users?.department ||
          "부서 없음";

        const type =
          getEditType(record);

        const processingStatus =
          getProcessingStatus(record);

        const statusType =
          processingStatus === "수정 완료"
            ? "normal"
            : getStatusType(record);

        return `
          <tr>
            <td>
              <div class="employee">
                <span class="avatar">
                  ${escapeHtml(
                    employeeName.slice(0, 1)
                  )}
                </span>

                <div>
                  <strong>
                    ${escapeHtml(employeeName)}
                  </strong>

                  <p>
                    ${escapeHtml(department)}
                  </p>
                </div>
              </div>
            </td>

            <td>
              ${escapeHtml(
                formatDate(record.work_date)
              )}
            </td>

            <td>
              <span class="edit-type-badge">
                ${escapeHtml(type)}
              </span>
            </td>

            <td>
              ${escapeHtml(
                formatTime(
                  record.check_in_time
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                formatTime(
                  record.check_out_time
                )
              )}
            </td>

            <td>
              <span class="status ${getStatusClass(
                statusType
              )}">
                ${escapeHtml(
                  processingStatus
                )}
              </span>
            </td>

            <td>
              <button
                class="table-action-btn"
                type="button"
                data-edit-id="${escapeHtml(
                  record.id
                )}"
              >
                수정
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

  editTableBody
    .querySelectorAll("[data-edit-id]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openEditModal(
            button.dataset.editId
          );
        }
      );
    });
}

/* =========================
  통계
========================= */

function updateStats() {
  const requiredRecords =
    attendanceRecords.filter(
      (record) =>
        getProcessingStatus(record) ===
        "수정 필요"
    );

  const missingCheckOut =
    requiredRecords.filter(
      (record) =>
        getEditType(record) ===
        "퇴근 누락"
    ).length;

  const locationErrors =
    requiredRecords.filter(
      (record) =>
        getEditType(record) ===
        "위치 오류"
    ).length;

  const today = getTodayString();

  const completedToday =
    editHistories.filter((history) => {
      if (!history.created_at) {
        return false;
      }

      const createdDate = new Date(
        history.created_at
      );

      const localDate = [
        createdDate.getFullYear(),
        String(
          createdDate.getMonth() + 1
        ).padStart(2, "0"),
        String(
          createdDate.getDate()
        ).padStart(2, "0"),
      ].join("-");

      return localDate === today;
    }).length;

  if (editRequiredCount) {
    editRequiredCount.textContent =
      requiredRecords.length;
  }

  if (missingCheckOutCount) {
    missingCheckOutCount.textContent =
      missingCheckOut;
  }

  if (locationErrorCount) {
    locationErrorCount.textContent =
      locationErrors;
  }

  if (todayEditedCount) {
    todayEditedCount.textContent =
      completedToday;
  }
}

/* =========================
  수정 이력 변경 내용
========================= */

function getChangedText(history) {
  const changes = [];

  const oldCheckIn =
    formatTime(
      history.old_check_in_time
    );

  const newCheckIn =
    formatTime(
      history.new_check_in_time
    );

  const oldCheckOut =
    formatTime(
      history.old_check_out_time
    );

  const newCheckOut =
    formatTime(
      history.new_check_out_time
    );

  if (oldCheckIn !== newCheckIn) {
    changes.push(
      `출근 ${oldCheckIn} → ${newCheckIn}`
    );
  }

  if (oldCheckOut !== newCheckOut) {
    changes.push(
      `퇴근 ${oldCheckOut} → ${newCheckOut}`
    );
  }

  if (
    history.old_status !==
    history.new_status
  ) {
    changes.push(
      `상태 ${
        history.old_status || "없음"
      } → ${
        history.new_status || "없음"
      }`
    );
  }

  if (!changes.length) {
    return "기록 확인 및 수정 완료";
  }

  return changes.join(" / ");
}

/* =========================
  최근 수정 이력 출력
========================= */

function renderEditHistories() {
  if (!editHistoryList) {
    return;
  }

  if (!editHistories.length) {
    editHistoryList.innerHTML = `
      <div class="edit-history-item">
        <p>등록된 수정 이력이 없습니다.</p>
      </div>
    `;

    return;
  }

  editHistoryList.innerHTML =
    editHistories
      .slice(0, 10)
      .map((history) => {
        const employeeName =
          history.users?.name ||
          "직원 정보 없음";

        return `
          <div class="edit-history-item">
            <strong>
              ${escapeHtml(employeeName)}
            </strong>

            <p>
              ${escapeHtml(
                getChangedText(history)
              )}
            </p>

            <span>
              ${escapeHtml(
                history.edit_reason ||
                history.edit_type ||
                "-"
              )}
            </span>

            ${
              history.memo
                ? `
                  <p>
                    ${escapeHtml(
                      history.memo
                    )}
                  </p>
                `
                : ""
            }

            <p>
              수정자:
              ${escapeHtml(
                history.editor_name ||
                "관리자"
              )}
            </p>

            <small>
              ${escapeHtml(
                formatDateTime(
                  history.created_at
                )
              )}
            </small>
          </div>
        `;
      })
      .join("");
}

/* =========================
  모달 열기
========================= */

function openEditModal(recordId) {
  const record =
    attendanceRecords.find(
      (item) =>
        String(item.id) ===
        String(recordId)
    );

  if (!record || !editModal) {
    return;
  }

  selectedRecordId = record.id;

  const employeeName =
    record.users?.name ||
    "이름 없음";

  const department =
    record.users?.department ||
    "부서 없음";

  const workplace =
    record.workplaces?.name ||
    "미배정";

  const type = getEditType(record);

  editModalEmployeeName.textContent =
    employeeName;

  editModalEmployeeInfo.textContent =
    `${formatDate(
      record.work_date
    )} · ${type} · ${department} · ${workplace}`;

  editCheckInInput.value =
    getTimeInputValue(
      record.check_in_time
    );

  editCheckOutInput.value =
    getTimeInputValue(
      record.check_out_time
    );

  editRecordStatusSelect.value =
    getProcessingStatus(record);

  const defaultReasonMap = {
    "퇴근 누락": "직원 퇴근 누락",
    "출근 누락": "직원 출근 누락",
    "위치 오류": "GPS 오류",
    "시간 조정": "근무시간 조정",
  };

  editReasonSelect.value =
    defaultReasonMap[type] ||
    "기타";

  editMemoInput.value = "";

  editModal.classList.add("active");
  editModal.style.display = "flex";

  document.body.style.overflow =
    "hidden";
}

/* =========================
  모달 닫기
========================= */

function closeEditModal() {
  if (!editModal) {
    return;
  }

  editModal.classList.remove("active");
  editModal.style.display = "none";

  document.body.style.overflow = "";

  selectedRecordId = null;
}

/* =========================
  저장값 검증
========================= */

function validateEditValues(
  workDate,
  checkInValue,
  checkOutValue
) {
  if (
    checkInValue &&
    checkOutValue
  ) {
    const checkInDate = new Date(
      createDateTimeValue(
        workDate,
        checkInValue
      )
    );

    const checkOutDate = new Date(
      createDateTimeValue(
        workDate,
        checkOutValue
      )
    );

    if (
      checkOutDate.getTime() <
      checkInDate.getTime()
    ) {
      alert(
        "퇴근 시간은 출근 시간보다 빠를 수 없습니다."
      );

      return false;
    }
  }

  if (
    !editReasonSelect.value
  ) {
    alert("수정 사유를 선택해 주세요.");
    return false;
  }

  if (
    editReasonSelect.value === "기타" &&
    !editMemoInput.value.trim()
  ) {
    alert(
      "수정 사유가 기타인 경우 상세 메모를 입력해 주세요."
    );

    return false;
  }

  return true;
}

/* =========================
  attendance 상태 결정

  시간을 정상적으로 입력하면
  위치 오류 상태를 정상 상태로 변경한다.
========================= */

function getUpdatedAttendanceStatus(
  record,
  processingStatus
) {
  if (
    processingStatus === "수정 필요"
  ) {
    return record.status;
  }

  const currentStatus = String(
    record.status || ""
  ).toLowerCase();

  if (
    currentStatus ===
      "location_error" ||
    currentStatus === "location" ||
    currentStatus === "위치오류" ||
    currentStatus === "위치 오류"
  ) {
    return "normal";
  }

  return record.status || "normal";
}

/* =========================
  출퇴근 기록 저장
========================= */

async function saveAttendanceEdit() {
  if (!selectedRecordId) {
    return;
  }

  const record =
    attendanceRecords.find(
      (item) =>
        String(item.id) ===
        String(selectedRecordId)
    );

  if (!record) {
    alert(
      "수정할 출퇴근 기록을 찾지 못했습니다."
    );

    return;
  }

  const checkInValue =
    editCheckInInput.value;

  const checkOutValue =
    editCheckOutInput.value;

  const processingStatus =
    editRecordStatusSelect.value;

  const editReason =
    editReasonSelect.value;

  const memo =
    editMemoInput.value.trim();

  if (
    !validateEditValues(
      record.work_date,
      checkInValue,
      checkOutValue
    )
  ) {
    return;
  }

  const newCheckInTime =
    createDateTimeValue(
      record.work_date,
      checkInValue
    );

  const newCheckOutTime =
    createDateTimeValue(
      record.work_date,
      checkOutValue
    );

  const newStatus =
    getUpdatedAttendanceStatus(
      record,
      processingStatus
    );

  const historyPayload = {
    attendance_id: record.id,
    user_id:
      record.user_id ||
      record.users?.id ||
      null,

    work_date: record.work_date,

    old_check_in_time:
      record.check_in_time,

    new_check_in_time:
      newCheckInTime,

    old_check_out_time:
      record.check_out_time,

    new_check_out_time:
      newCheckOutTime,

    old_status:
      record.status,

    new_status:
      newStatus,

    edit_type:
      getEditType(record),

    edit_reason:
      editReason,

    memo:
      memo || null,

    editor_name:
      getCurrentAdminName(),
  };

  editSaveBtn.disabled = true;
  editSaveBtn.textContent = "저장 중...";

  try {
    /*
      1. attendance 실제 기록 수정
    */
    const {
      data: updatedAttendance,
      error: updateError,
    } = await supabase
      .from("attendance")
      .update({
        check_in_time:
          newCheckInTime,

        check_out_time:
          newCheckOutTime,

        status:
          newStatus,
      })
      .eq("id", record.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    /*
      2. 수정 이력 저장
    */
    const {
      error: historyError,
    } = await supabase
      .from(
        "attendance_edit_history"
      )
      .insert(historyPayload);

    if (historyError) {
      /*
        출퇴근 기록은 수정됐지만
        이력 저장만 실패한 경우
      */
      console.error(
        "수정 이력 저장 실패:",
        historyError
      );

      alert(
        "출퇴근 기록은 수정되었지만 수정 이력 저장에 실패했습니다. attendance_edit_history 테이블과 RLS 정책을 확인해 주세요."
      );
    } else {
      alert(
        "출퇴근 기록이 수정되었습니다."
      );
    }

    closeEditModal();

    await loadPageData();
  } catch (error) {
    console.error(
      "출퇴근 기록 수정 실패:",
      error
    );

    alert(
      `수정에 실패했습니다.\n${error.message || "Supabase 설정을 확인해 주세요."}`
    );
  } finally {
    editSaveBtn.disabled = false;
    editSaveBtn.textContent = "저장";
  }
}

/* =========================
  수정 이력 다운로드
========================= */

function downloadEditHistory() {
  if (!editHistories.length) {
    alert(
      "다운로드할 수정 이력이 없습니다."
    );

    return;
  }

  if (
    typeof XLSX === "undefined"
  ) {
    alert(
      "엑셀 라이브러리를 불러오지 못했습니다."
    );

    return;
  }

  const excelRows =
    editHistories.map(
      (history, index) => ({
        No: index + 1,

        직원명:
          history.users?.name ||
          "직원 정보 없음",

        근무일:
          history.work_date,

        수정유형:
          history.edit_type,

        기존출근:
          formatTime(
            history.old_check_in_time
          ),

        수정출근:
          formatTime(
            history.new_check_in_time
          ),

        기존퇴근:
          formatTime(
            history.old_check_out_time
          ),

        수정퇴근:
          formatTime(
            history.new_check_out_time
          ),

        기존상태:
          history.old_status || "-",

        수정상태:
          history.new_status || "-",

        수정사유:
          history.edit_reason || "-",

        상세메모:
          history.memo || "-",

        수정자:
          history.editor_name ||
          "관리자",

        수정일시:
          formatDateTime(
            history.created_at
          ),
      })
    );

  const worksheet =
    XLSX.utils.json_to_sheet(
      excelRows
    );

  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 35 },
    { wch: 12 },
    { wch: 20 },
  ];

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "출퇴근수정이력"
  );

  XLSX.writeFile(
    workbook,
    `출퇴근_수정이력_${getTodayString()}.xlsx`
  );
}

/* =========================
  로딩
========================= */

function showLoading() {
  if (editTableBody) {
    editTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">
          출퇴근 기록을 불러오는 중입니다.
        </td>
      </tr>
    `;
  }

  if (editHistoryList) {
    editHistoryList.innerHTML = `
      <div class="edit-history-item">
        <p>수정 이력을 불러오는 중입니다.</p>
      </div>
    `;
  }
}

/* =========================
  전체 데이터 조회
========================= */

async function loadPageData() {
  showLoading();

  try {
    /*
      이력을 먼저 불러와야
      각 기록의 수정 완료 여부를 판단할 수 있다.
    */
    await Promise.all([
      fetchAttendanceRecords(),
      fetchEditHistories(),
    ]);

    filterEditRecords();
    renderEditHistories();
    updateStats();
  } catch (error) {
    console.error(
      "출퇴근 수정 페이지 조회 실패:",
      error
    );

    if (editTableBody) {
      editTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-row">
            출퇴근 기록을 불러오지 못했습니다.
            <br>
            ${escapeHtml(
              error.message ||
              "Supabase 설정을 확인해 주세요."
            )}
          </td>
        </tr>
      `;
    }

    if (editHistoryList) {
      editHistoryList.innerHTML = `
        <div class="edit-history-item">
          <p>
            수정 이력을 불러오지 못했습니다.
          </p>
        </div>
      `;
    }
  }
}

/* =========================
  필터 초기화
========================= */

function resetFilters() {
  if (editDateFilter) {
    editDateFilter.value =
      getTodayString();
  }

  if (editTypeFilter) {
    editTypeFilter.value = "all";
  }

  if (editStatusFilter) {
    editStatusFilter.value = "all";
  }

  if (editSearchInput) {
    editSearchInput.value = "";
  }

  loadPageData();
}

/* =========================
  이벤트
========================= */

function bindEvents() {
  editDateFilter?.addEventListener(
    "change",
    loadPageData
  );

  editTypeFilter?.addEventListener(
    "change",
    filterEditRecords
  );

  editStatusFilter?.addEventListener(
    "change",
    filterEditRecords
  );

  editSearchInput?.addEventListener(
    "input",
    filterEditRecords
  );

  editModalCloseBtn?.addEventListener(
    "click",
    closeEditModal
  );

  editModalCancelBtn?.addEventListener(
    "click",
    closeEditModal
  );

  editSaveBtn?.addEventListener(
    "click",
    saveAttendanceEdit
  );

  editHistoryDownloadBtn?.addEventListener(
    "click",
    downloadEditHistory
  );

  editResetFilterBtn?.addEventListener(
    "click",
    resetFilters
  );

  editModal?.addEventListener(
    "click",
    (event) => {
      if (
        event.target === editModal
      ) {
        closeEditModal();
      }
    }
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        editModal?.classList.contains(
          "active"
        )
      ) {
        closeEditModal();
      }
    }
  );
}

/* =========================
  초기 실행
========================= */

async function initAttendanceEditPage() {
  if (editDateFilter) {
    editDateFilter.value =
      getTodayString();
  }

  bindEvents();
  await loadPageData();
}

initAttendanceEditPage();