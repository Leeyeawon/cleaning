import supabase from "./supabase.js";

const byId = (id) =>
  document.getElementById(id);

const editDateFilter =
  byId("editDateFilter");

const editTypeFilter =
  byId("editTypeFilter");

const editStatusFilter =
  byId("editStatusFilter");

const editWorkplaceFilter =
  byId("editWorkplaceFilter");

const editSearchInput =
  byId("editSearchInput");

const editTableBody =
  byId("editTableBody");

const editHistoryList =
  byId("editHistoryList");

const editModal =
  byId("editModal");

const editModalCloseBtn =
  byId("editModalCloseBtn");

const editModalCancelBtn =
  byId("editModalCancelBtn");

const editSaveBtn =
  byId("editSaveBtn");

const editModalEmployeeName =
  byId("editModalEmployeeName");

const editModalEmployeeInfo =
  byId("editModalEmployeeInfo");

const editCheckInInput =
  byId("editCheckInInput");

const editCheckOutInput =
  byId("editCheckOutInput");

const editWorkplaceSelect =
  byId("editWorkplaceSelect");

const editRecordStatusSelect =
  byId("editRecordStatusSelect");

const editReasonSelect =
  byId("editReasonSelect");

const editMemoInput =
  byId("editMemoInput");

const editRequiredCount =
  byId("editRequiredCount");

const missingCheckOutCount =
  byId("missingCheckOutCount");

const locationErrorCount =
  byId("locationErrorCount");

const todayEditedCount =
  byId("todayEditedCount");

const editResetFilterBtn =
  byId("editResetFilterBtn");

const editPageParams =
  new URLSearchParams(window.location.search);

const presetAttendanceId =
  editPageParams.get("attendanceId");

const presetWorkDate =
  editPageParams.get("date");

const presetUserId =
  editPageParams.get("userId");

const editReturnTo =
  editPageParams.get("returnTo");

function getSafeReturnUrl() {
  if (
    editReturnTo &&
    editReturnTo.startsWith(
      "admin-employee-detail.html?"
    )
  ) {
    return editReturnTo;
  }

  return null;
}

let attendanceRows = [];
let editHistories = [];
let workplaces = [];
let selectedRow = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTodayString() {
  const now = new Date();

  return [
    now.getFullYear(),

    String(
      now.getMonth() + 1
    ).padStart(2, "0"),

    String(
      now.getDate()
    ).padStart(2, "0"),
  ].join("-");
}

function formatDate(value) {
  if (!value) return "—";

  const date =
    new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "ko-KR"
  );
}

function formatTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString(
    "ko-KR",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );
}

function getTimeInputValue(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    String(
      date.getHours()
    ).padStart(2, "0"),

    String(
      date.getMinutes()
    ).padStart(2, "0"),
  ].join(":");
}

function createDateTimeValue(
  workDate,
  timeValue
) {
  if (!timeValue) return null;

  return (
    `${workDate}T` +
    `${timeValue}:00+09:00`
  );
}

function normalizeStatus(status) {
  const value =
    String(status || "")
      .trim()
      .toLowerCase();

  if (
    value === "정상" ||
    value === "normal" ||
    value === "done"
  ) {
    return "done";
  }

  if (
    value === "지각" ||
    value === "late"
  ) {
    return "late";
  }

  if (
    value === "결근" ||
    value === "absent"
  ) {
    return "absent";
  }

  if (
    value === "위치오류" ||
    value === "위치 오류" ||
    value === "location" ||
    value === "location_error"
  ) {
    return "location_error";
  }

  if (
    value === "연차" ||
    value === "annual_leave"
  ) {
    return "annual_leave";
  }

  if (value === "working") {
    return "working";
  }

  return "done";
}

function getAttendanceStatusText(
  status
) {
  const labels = {
    done: "정상·근무 완료",
    normal: "정상",
    working: "근무 중",
    late: "지각",
    absent: "결근",
    location_error: "위치 오류",
    early_leave: "조퇴",
    정상: "정상",
    지각: "지각",
    결근: "결근",
    위치오류: "위치 오류",
    annual_leave: "연차",
    연차: "연차",
  };

  return labels[status] ||
    status ||
    "기록 없음";
}

function hasEditHistory(row) {
  if (!row.attendance_id) {
    return false;
  }

  return editHistories.some(
    (history) =>
      String(
        history.attendance_id
      ) ===
      String(
        row.attendance_id
      )
  );
}

function isPastDate(workDate) {
  return workDate <
    getTodayString();
}

function getEditType(row) {
  if (row.is_annual_leave) {
    return "연차";
  }
  if (!row.has_record) {
    return "기록 없음";
  }

  if (
    Number(row.duplicate_count) > 1
  ) {
    return "중복 기록";
  }

  if (
    !row.check_in_time &&
    row.check_out_time
  ) {
    return "출근 누락";
  }

  if (
    row.check_in_time &&
    !row.check_out_time
  ) {
    return "퇴근 누락";
  }

  const status =
    normalizeStatus(
      row.attendance_status
    );

  if (
    status ===
    "location_error"
  ) {
    return "위치 오류";
  }

  if (
    !row.check_in_time &&
    !row.check_out_time
  ) {
    return status === "absent"
      ? "시간 조정"
      : "출근 누락";
  }

  return "시간 조정";
}

function needsEdit(row) {
  if (row.is_annual_leave) {
    return false;
  }

  if (!row.has_record) {
    return true;
  }

  if (
    Number(row.duplicate_count) > 1
  ) {
    return true;
  }

  if (!row.check_in_time) {
    return true;
  }

  if (
    !row.check_out_time &&
    isPastDate(row.work_date)
  ) {
    return true;
  }

  return normalizeStatus(
    row.attendance_status
  ) === "location_error";
}

function getProcessingStatus(row) {
  if (hasEditHistory(row)) {
    return "수정 완료";
  }

  return needsEdit(row)
    ? "수정 필요"
    : "정상 기록";
}

function getStatusClass(status) {
  if (status === "수정 필요") {
    return "late";
  }

  if (status === "수정 완료") {
    return "normal";
  }

  return "normal";
}

function getErrorMessage(error) {
  const message =
    error?.message || "";

  const mappings = [
    [
      "ATTENDANCE_ALREADY_EXISTS",
      "해당 직원의 같은 날짜 출퇴근 기록이 이미 존재합니다.",
    ],
    [
      "CHECK_OUT_BEFORE_CHECK_IN",
      "퇴근 시간은 출근 시간보다 빠를 수 없습니다.",
    ],
    [
      "WORKPLACE_NOT_FOUND",
      "선택한 근무지를 찾지 못했습니다.",
    ],
    [
      "FUTURE_ATTENDANCE_NOT_ALLOWED",
      "미래 날짜의 출퇴근 기록은 만들 수 없습니다.",
    ],
    [
      "ADMIN_PERMISSION_REQUIRED",
      "관리자 권한이 필요합니다.",
    ],
  ];

  const matched =
    mappings.find(
      ([code]) =>
        message.includes(code)
    );

  return matched?.[1] ||
    message ||
    "출퇴근 기록을 저장하지 못했습니다.";
}

async function fetchAttendanceRows() {
  const selectedDate =
    editDateFilter.value;

  const [
    attendanceResult,
    leaveResult,
  ] = await Promise.all([
    supabase.rpc(
      "admin_get_attendance_edit_rows",
      {
        p_work_date:
          selectedDate,
      }
    ),

    supabase
      .from(
        "employee_daily_notes"
      )
      .select(`
        user_id,
        note_date,
        content,
        day_type
      `)
      .eq(
        "note_date",
        selectedDate
      )
      .eq(
        "day_type",
        "annual_leave"
      ),
  ]);

  if (attendanceResult.error) {
    throw attendanceResult.error;
  }

  if (leaveResult.error) {
    throw leaveResult.error;
  }

  const leaveMap =
    new Map(
      (leaveResult.data || [])
        .map((leave) => [
          String(leave.user_id),
          leave,
        ])
    );

  attendanceRows =
    (
      attendanceResult.data || []
    ).map((row) => {
      const leave =
        leaveMap.get(
          String(row.user_id)
        );

      const isAnnualLeave =
        Boolean(leave);

      return {
        ...row,

        is_annual_leave:
          isAnnualLeave,

        annual_leave_content:
          leave?.content || "",

        attendance_status:
          isAnnualLeave
            ? "annual_leave"
            : row.attendance_status,

        has_record:
          isAnnualLeave ||
          row.has_record,

        row_key:
          row.attendance_id
            ? `attendance-${
                row.attendance_id
              }`
            : `employee-${
                row.user_id
              }`,
      };
    });
}

async function fetchEditHistories() {
  const { data, error } =
    await supabase.rpc(
      "admin_get_attendance_edit_history",
      {
        p_limit: 100,
      }
    );

  if (error) throw error;

  editHistories = data || [];
}

async function fetchWorkplaces() {
  const { data, error } =
    await supabase
      .from("workplaces")
      .select(
        "id, name, is_active"
      )
      .order("name");

  if (error) throw error;

  workplaces = data || [];
}

function getFilteredRows() {
  const selectedType =
    editTypeFilter.value;

  const selectedStatus =
    editStatusFilter.value;

  const selectedWorkplace =
    editWorkplaceFilter.value ||
    "all";

  const keyword =
    editSearchInput.value
      .trim()
      .toLowerCase();

  return attendanceRows.filter(
    (row) => {
      const type =
        getEditType(row);

      const attendanceStatus =
        row.is_annual_leave
          ? "annual_leave"
          : normalizeStatus(
              row.attendance_status
            );

      const searchText = [
        row.employee_name,
        row.department,
        row.workplace_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (
          selectedType === "all" ||
          selectedType === type
        ) &&
        (
          selectedStatus === "all" ||
          selectedStatus ===
            attendanceStatus
        ) &&
        (
          selectedWorkplace ===
            "all" ||

          (
            selectedWorkplace ===
              "unassigned"
              ? !row.workplace_id
              : String(
                  row.workplace_id
                ) ===
                String(
                  selectedWorkplace
                )
          )
        ) &&
        (
          !keyword ||
          searchText.includes(
            keyword
          )
        )
      );
    }
  );
}

function renderTable() {
  if (!editTableBody) return;

  const rows = getFilteredRows();

  if (!rows.length) {
    editTableBody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="empty-row"
        >
          조회된 직원 또는 출퇴근 기록이 없습니다.
        </td>
      </tr>
    `;

    return;
  }

  editTableBody.innerHTML =
    rows.map((row) => {
      const type =
        getEditType(row);

      const processingStatus =
        getProcessingStatus(row);

      const employeeName =
        row.employee_name ||
        "이름 없음";

      const autoCloseBadge =
        row.is_auto_closed
          ? `
            <span
              class="auto-close-badge"
              title="자동 처리 시각: ${escapeHtml(
                formatDateTime(
                  row.auto_closed_at
                )
              )}"
            >
              자동 퇴근
            </span>
          `
          : "";

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
                  ${escapeHtml(
                    employeeName
                  )}
                </strong>

                <p>
                  ${escapeHtml(
                    row.department ||
                    "소속 없음"
                  )}
                </p>
              </div>
            </div>
          </td>

          <td>
            ${escapeHtml(
              formatDate(
                row.work_date
              )
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
                row.check_in_time
              )
            )}
          </td>

          <td>
            ${escapeHtml(
              formatTime(
                row.check_out_time
              )
            )}
          </td>

          <td>
            <div class="edit-status-stack">
              <span
                class="status ${getStatusClass(
                  processingStatus
                )}"
                title="${escapeHtml(
                  getAttendanceStatusText(
                    row.attendance_status
                  )
                )}"
              >
                ${escapeHtml(
                  processingStatus
                )}
              </span>

              ${autoCloseBadge}
            </div>
          </td>

          <td>
            <button
              class="table-action-btn"
              type="button"
              data-row-key="${escapeHtml(
                row.row_key
              )}"
            >
              ${
                row.has_record
                  ? "수정"
                  : "기록 추가"
              }
            </button>
          </td>
        </tr>
      `;
    }).join("");

  editTableBody
    .querySelectorAll(
      "[data-row-key]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openEditModal(
            button.dataset.rowKey
          );
        }
      );
    });
}

function updateStats() {
  const requiredRows =
    attendanceRows.filter(
      (row) =>
        needsEdit(row) &&
        !hasEditHistory(row)
    );

  const missingCheckout =
    requiredRows.filter(
      (row) =>
        getEditType(row) ===
        "퇴근 누락"
    ).length;

  const locationErrors =
    requiredRows.filter(
      (row) =>
        getEditType(row) ===
        "위치 오류"
    ).length;

  const today =
    getTodayString();

  const editedToday =
    editHistories.filter(
      (history) => {
        if (!history.created_at) {
          return false;
        }

        const date =
          new Date(
            history.created_at
          );

        const dateKey = [
          date.getFullYear(),

          String(
            date.getMonth() + 1
          ).padStart(2, "0"),

          String(
            date.getDate()
          ).padStart(2, "0"),
        ].join("-");

        return dateKey === today;
      }
    ).length;

  editRequiredCount.textContent =
    requiredRows.length;

  missingCheckOutCount.textContent =
    missingCheckout;

  locationErrorCount.textContent =
    locationErrors;

  todayEditedCount.textContent =
    editedToday;
}

function getChangedText(history) {
  const changes = [];

  const oldIn =
    formatTime(
      history.old_check_in_time
    );

  const newIn =
    formatTime(
      history.new_check_in_time
    );

  const oldOut =
    formatTime(
      history.old_check_out_time
    );

  const newOut =
    formatTime(
      history.new_check_out_time
    );

  if (oldIn !== newIn) {
    changes.push(
      `출근 ${oldIn} → ${newIn}`
    );
  }

  if (oldOut !== newOut) {
    changes.push(
      `퇴근 ${oldOut} → ${newOut}`
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

  return changes.length
    ? changes.join(" / ")
    : "기록 확인";
}

function renderHistories() {
  if (!editHistoryList) return;

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
      .map((history) => `
        <div class="edit-history-item">
          <strong>
            ${escapeHtml(
              history.employee_name ||
              "직원 정보 없음"
            )}
          </strong>

          <p>
            ${escapeHtml(
              getChangedText(history)
            )}
          </p>

          <span>
            ${escapeHtml(
              history.edit_reason ||
              history.edit_type
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
      `)
      .join("");
}

function renderWorkplaceFilterOptions() {
  const currentValue =
    editWorkplaceFilter.value ||
    "all";

  editWorkplaceFilter.innerHTML = `
    <option value="all">
      전체 근무지
    </option>

    <option value="unassigned">
      근무지 미배정
    </option>

    ${workplaces
      .filter(
        (workplace) =>
          workplace.is_active !==
          false
      )
      .map(
        (workplace) => `
          <option
            value="${escapeHtml(
              workplace.id
            )}"
          >
            ${escapeHtml(
              workplace.name
            )}
          </option>
        `
      )
      .join("")}
  `;

  const valueExists = [
    ...editWorkplaceFilter.options,
  ].some(
    (option) =>
      option.value ===
      currentValue
  );

  editWorkplaceFilter.value =
    valueExists
      ? currentValue
      : "all";
}

function renderWorkplaceOptions(
  selectedWorkplaceId
) {
  editWorkplaceSelect.innerHTML = `
    <option value="">
      미배정
    </option>

    ${workplaces.map(
      (workplace) => `
        <option
          value="${escapeHtml(
            workplace.id
          )}"
        >
          ${escapeHtml(
            workplace.name
          )}
          ${
            workplace.is_active
              ? ""
              : " (비활성)"
          }
        </option>
      `
    ).join("")}
  `;

  editWorkplaceSelect.value =
    selectedWorkplaceId
      ? String(
          selectedWorkplaceId
        )
      : "";
}

function syncAnnualLeaveFields() {
  const isAnnualLeave =
    editRecordStatusSelect.value ===
    "annual_leave";

  editCheckInInput.disabled =
    isAnnualLeave;

  editCheckOutInput.disabled =
    isAnnualLeave;

  editWorkplaceSelect.disabled =
    isAnnualLeave;

  if (isAnnualLeave) {
    editCheckInInput.value = "";
    editCheckOutInput.value = "";
  }
}

function openEditModal(rowKey) {
  const row =
    attendanceRows.find(
      (item) =>
        item.row_key === rowKey
    );

  if (!row) return;

  selectedRow = row;

  editModalEmployeeName.textContent =
    row.employee_name ||
    "직원명";

  editModalEmployeeInfo.textContent =
    [
      formatDate(
        row.work_date
      ),

      getEditType(row),

      row.department ||
        "소속 없음",

      row.workplace_name ||
        "근무지 미배정",

      row.is_auto_closed
        ? `자동 퇴근 ${
            formatDateTime(
              row.auto_closed_at
            )
          }`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

  editCheckInInput.value =
    getTimeInputValue(
      row.check_in_time
    );

  editCheckOutInput.value =
    getTimeInputValue(
      row.check_out_time
    );

  renderWorkplaceOptions(
    row.workplace_id
  );

  editRecordStatusSelect.value =
    row.is_annual_leave
      ? "annual_leave"
      : normalizeStatus(
          row.attendance_status
        );

  syncAnnualLeaveFields();

  const reasonMap = {
    "기록 없음":
      "직원 출근 누락",

    "출근 누락":
      "직원 출근 누락",

    "퇴근 누락":
      "직원 퇴근 누락",

    "위치 오류":
      "GPS 오류",

    "중복 기록":
      "관리자 확인 완료",

    "시간 조정":
      "근무시간 조정",
  };

  editReasonSelect.value =
    reasonMap[
      getEditType(row)
    ] || "기타";

  editMemoInput.value =
    row.is_annual_leave
      ? row.annual_leave_content ||
        ""
      : "";
  
  const title =
    editModal.querySelector(
      ".edit-modal-header h3"
    );

  if (title) {
    title.textContent =
      row.has_record
        ? "출퇴근 기록 수정"
        : "출퇴근 기록 추가";
  }

  editModal.classList.add(
    "active"
  );

  editModal.style.display =
    "flex";

  document.body.style.overflow =
    "hidden";
}

function closeEditModal() {
  editModal.classList.remove(
    "active"
  );

  editModal.style.display =
    "none";

  document.body.style.overflow =
    "";

  selectedRow = null;
}

function validateValues(
  status,
  checkInValue,
  checkOutValue
) {
  if (
    checkOutValue &&
    !checkInValue
  ) {
    alert(
      "퇴근 시간을 입력하려면 출근 시간도 입력해야 합니다."
    );

    return false;
  }

  if (
    status === "done" &&
    (
      !checkInValue ||
      !checkOutValue
    )
  ) {
    alert(
      "근무 완료 상태는 출근·퇴근 시간을 모두 입력해야 합니다."
    );

    return false;
  }

  if (
    status === "working" &&
    !checkInValue
  ) {
    alert(
      "근무 중 상태는 출근 시간을 입력해야 합니다."
    );

    return false;
  }

  if (
    checkInValue &&
    checkOutValue
  ) {
    const checkIn =
      new Date(
        createDateTimeValue(
          selectedRow.work_date,
          checkInValue
        )
      );

    const checkOut =
      new Date(
        createDateTimeValue(
          selectedRow.work_date,
          checkOutValue
        )
      );

    if (checkOut < checkIn) {
      alert(
        "퇴근 시간은 출근 시간보다 빠를 수 없습니다."
      );

      return false;
    }
  }

  if (
    editReasonSelect.value ===
      "기타" &&
    !editMemoInput.value.trim()
  ) {
    alert(
      "수정 사유가 기타인 경우 상세 메모를 입력해주세요."
    );

    return false;
  }

  return true;
}

async function saveAttendanceEdit() {
  if (!selectedRow) return;

  const status =
    editRecordStatusSelect.value;

  if (status === "annual_leave") {
    const confirmed =
      confirm(
        "연차로 변경하면 해당 날짜의 기존 출퇴근 기록이 삭제됩니다.\n계속하시겠습니까?"
      );

    if (!confirmed) {
      return;
    }

    editSaveBtn.disabled = true;
    editSaveBtn.textContent =
      "연차 등록 중...";

    try {
      const { error } =
        await supabase.rpc(
          "admin_convert_attendance_to_annual_leave",
          {
            p_user_id:
              selectedRow.user_id,

            p_work_date:
              selectedRow.work_date,

            p_memo:
              editMemoInput.value
                .trim() || null,
          }
        );

      if (error) {
        throw error;
      }

      alert(
        "기존 출퇴근 기록을 삭제하고 연차로 변경했습니다."
      );

      closeEditModal();

      const safeReturnUrl =
        getSafeReturnUrl();

      if (safeReturnUrl) {
        window.location.replace(
          safeReturnUrl
        );

        return;
      }

      await loadPageData();
    } catch (error) {
      console.error(
        "연차 변경 실패:",
        error
      );

      alert(
        `연차로 변경하지 못했습니다.\n${
          error.message || ""
        }`
      );
    } finally {
      editSaveBtn.disabled = false;
      editSaveBtn.textContent = "저장";
    }

    return;
  }

  const checkInValue =
    status === "absent"
      ? ""
      : editCheckInInput.value;

  const checkOutValue =
    status === "absent"
      ? ""
      : editCheckOutInput.value;

  if (
    !validateValues(
      status,
      checkInValue,
      checkOutValue
    )
  ) {
    return;
  }

  editSaveBtn.disabled = true;
  editSaveBtn.textContent =
    "저장 중...";

  try {
    const {
      data,
      error,
    } = await supabase.rpc(
      "admin_save_attendance_record",
      {
        p_attendance_id:
          selectedRow.attendance_id ||
          null,

        p_user_id:
          selectedRow.user_id,

        p_work_date:
          selectedRow.work_date,

        p_workplace_id:
          editWorkplaceSelect.value
            ? Number(
                editWorkplaceSelect
                  .value
              )
            : null,

        p_check_in_time:
          createDateTimeValue(
            selectedRow.work_date,
            checkInValue
          ),

        p_check_out_time:
          createDateTimeValue(
            selectedRow.work_date,
            checkOutValue
          ),

        p_status: status,

        p_edit_reason:
          editReasonSelect.value,

        p_memo:
          editMemoInput.value
            .trim(),
      }
    );

    if (error) throw error;

    alert(
      data?.created
        ? "출퇴근 기록이 추가되었습니다."
        : "출퇴근 기록이 수정되었습니다."
    );

  closeEditModal();

  const safeReturnUrl =
    getSafeReturnUrl();

  if (safeReturnUrl) {
    window.location.replace(
      safeReturnUrl
    );

    return;
  }

  await loadPageData();    
  } catch (error) {
    console.error(
      "출퇴근 기록 저장 실패:",
      error
    );

    alert(
      getErrorMessage(error)
    );
  } finally {
    editSaveBtn.disabled = false;
    editSaveBtn.textContent = "저장";
  }
}

function showLoading() {
  editTableBody.innerHTML = `
    <tr>
      <td
        colspan="7"
        class="empty-row"
      >
        직원 출퇴근 기록을 불러오는 중입니다.
      </td>
    </tr>
  `;

  editHistoryList.innerHTML = `
    <div class="edit-history-item">
      <p>
        수정 이력을 불러오는 중입니다.
      </p>
    </div>
  `;
}

async function loadPageData() {
  showLoading();

  try {
    await Promise.all([
      fetchAttendanceRows(),
      fetchEditHistories(),
      fetchWorkplaces(),
    ]);

    renderWorkplaceFilterOptions();

    renderTable();
    renderHistories();
    updateStats();
  } catch (error) {
    console.error(
      "출퇴근 수정 페이지 조회 실패:",
      error
    );

    editTableBody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="empty-row"
        >
          기록을 불러오지 못했습니다.
          <br>
          ${escapeHtml(
            error.message ||
            "Supabase 설정을 확인해주세요."
          )}
        </td>
      </tr>
    `;
  }
}

function resetFilters() {
  editDateFilter.value =
    getTodayString();

  editTypeFilter.value =
    "all";

  editStatusFilter.value =
    "all";

  editWorkplaceFilter.value =
    "all";

  editSearchInput.value = "";

  loadPageData();
}

function bindEvents() {
  editDateFilter.addEventListener(
    "change",
    loadPageData
  );

  editTypeFilter.addEventListener(
    "change",
    renderTable
  );

  editStatusFilter.addEventListener(
    "change",
    renderTable
  );

  editWorkplaceFilter.addEventListener(
    "change",
    renderTable
  );

  editSearchInput.addEventListener(
    "input",
    renderTable
  );

  editModalCloseBtn.addEventListener(
    "click",
    closeEditModal
  );

  editModalCancelBtn.addEventListener(
    "click",
    closeEditModal
  );

  editSaveBtn.addEventListener(
    "click",
    saveAttendanceEdit
  );

  editResetFilterBtn.addEventListener(
    "click",
    resetFilters
  );

  editRecordStatusSelect
    .addEventListener(
      "change",
      syncAnnualLeaveFields
    );

  editModal.addEventListener(
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
        editModal.classList.contains(
          "active"
        )
      ) {
        closeEditModal();
      }
    }
  );
}

async function init() {
  editDateFilter.value =
    presetWorkDate ||
    getTodayString();

  bindEvents();

  await loadPageData();

  if (
    !presetAttendanceId &&
    !presetUserId
  ) {
    return;
  }

  const targetRow =
    attendanceRows.find((row) => {
      if (presetAttendanceId) {
        return (
          String(
            row.attendance_id
          ) ===
          String(
            presetAttendanceId
          )
        );
      }

      return (
        String(row.user_id) ===
        String(presetUserId)
      );
    });

  if (!targetRow) {
    alert(
      "선택한 직원의 수정 정보를 찾지 못했습니다."
    );

    return;
  }

  editSearchInput.value =
    targetRow.employee_name || "";

  renderTable();

  openEditModal(
    targetRow.row_key
  );
}

init();