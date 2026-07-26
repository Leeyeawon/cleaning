/* =========================================================
   🔥 관리자 직원 상세 및 근무표 관리 (Supabase 실시간 DB 연동)
========================================================= */
import supabase from "./supabase.js";

const urlParams = new URLSearchParams(window.location.search);
const targetUserId = urlParams.get("id");

// DOM 연결 (detailAvatar는 HTML에서 삭제되어 안전하게 null 처리됨)
const detailName = document.getElementById("detailName");
const detailInfo = document.getElementById("detailInfo");
const detailPhone = document.getElementById("detailPhone");
const detailAppRole = document.getElementById( "detailAppRole" ); 
const detailAppApproval = document.getElementById( "detailAppApproval" ); const detailJoinDate = document.getElementById("detailJoinDate");
const detailStatus = document.getElementById("detailStatus");
const detailRegionList = document.getElementById("detailRegionList");
const employeeDetailTitle = document.getElementById("employeeDetailTitle");

const statWorkDays = document.getElementById("detailWorkDays");
const statLateCount = document.getElementById("detailLateCount");
const statAbsentCount = document.getElementById("detailAbsentCount");
const statWorkHours = document.getElementById("detailWorkHours");

const viewTabBtns = document.querySelectorAll(".view-tab-btn");
const timeNavigator = document.getElementById("timeNavigator");
const prevTimeBtn = document.getElementById("prevTimeBtn");
const nextTimeBtn = document.getElementById("nextTimeBtn");
const currentTimeDisplay = document.getElementById("currentTimeDisplay");
const customDateFilter = document.getElementById("customDateFilter");
const attendanceStartDate = document.getElementById("attendanceStartDate");
const attendanceEndDate = document.getElementById("attendanceEndDate");
const attendanceSearchBtn = document.getElementById("attendanceSearchBtn");
const detailRecordTableBody = document.getElementById("detailRecordTableBody");

const btnViewMonthly = document.getElementById("btnViewMonthly");
const btnDeactivate = document.getElementById("btnDeactivate");
const btnDeleteAccount = document.getElementById("btnDeleteAccount");
const btnExcelPrint = document.getElementById("btnExcelPrint");

const dailyNoteDate = document.getElementById("dailyNoteDate");
const dailyNoteInput = document.getElementById("dailyNoteInput");
const saveDailyNoteBtn = document.getElementById("saveDailyNoteBtn");
const deleteDailyNoteBtn = document.getElementById("deleteDailyNoteBtn");
const printSubtitle = document.getElementById("printSubtitle");

const editEmployeeBtn = document.getElementById("editEmployeeBtn");
const btnEditRegion = document.getElementById("btnEditRegion");
const employeeEditModal = document.getElementById("employeeEditModal");
const employeeEditForm = document.getElementById("employeeEditForm");
const employeeEditCloseBtn = document.getElementById("employeeEditCloseBtn");
const employeeEditCancelBtn = document.getElementById("employeeEditCancelBtn");
const editEmployeeName = document.getElementById("editEmployeeName");
const editEmployeePhone = document.getElementById("editEmployeePhone");
const editEmployeeRole = document.getElementById( "editEmployeeRole" ); 
const editEmployeeDepartment = document.getElementById("editEmployeeDepartment");
const regionEditModal = document.getElementById("regionEditModal");
const regionEditList = document.getElementById("regionEditList");
const regionEditCloseBtn = document.getElementById("regionEditCloseBtn");
const regionEditCancelBtn = document.getElementById("regionEditCancelBtn");
const regionEditSaveBtn = document.getElementById("regionEditSaveBtn");

const dailyNoteType = document.getElementById("dailyNoteType");
const toggleAttendanceRowsBtn = document.getElementById( "toggleAttendanceRowsBtn" );

let currentEmployeeData = null;
let viewMode = "monthly"; 
let selectedYear = new Date().getFullYear();
let selectedMonth = new Date().getMonth(); 
let currentAttendanceRecords = [];
let dailyNotes = new Map();
let attendanceExpanded = false;

function formatTimeOnly(timeString) {
  if (!timeString) return "00:00";
  const date = new Date(timeString);
  if (Number.isNaN(date.getTime())) return "00:00";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function calcWorkMinutes(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const diffMs = new Date(checkOut) - new Date(checkIn);
  return diffMs > 0 ? Math.floor(diffMs / 1000 / 60) : 0;
}

function formatMinutesToHoursText(totalMinutes) {
  if (totalMinutes <= 0) return "0시간 0분";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}시간 ${minutes}분`;
}

function getKoreanDayOfWeek(dateString) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const date = new Date(`${dateString}T00:00:00`);
  return days[date.getDay()] || "-";
}

function toLocalDateKey(
  year,
  monthIndex,
  day
) {
  return (
    `${year}-` +
    `${String(
      monthIndex + 1
    ).padStart(2, "0")}-` +
    `${String(day).padStart(2, "0")}`
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchEmployeeProfile() {
  if (!targetUserId) {
    alert(
      "직원 ID가 없습니다. 직원 목록으로 이동합니다."
    );

    location.href =
      "admin-employees.html";

    return null;
  }

  try {
    const { data, error } =
      await supabase.rpc(
        "admin_get_employees_v2" );

    if (error) {
      throw error;
    }

    const employeeList =
      Array.isArray(data) ? data : [];

    const employee =
      employeeList.find(
        (item) =>
          String(item.id) ===
          String(targetUserId)
      );

    if (!employee) {
      alert(
        "해당 직원 정보를 찾을 수 없습니다."
      );

      location.href =
        "admin-employees.html";

      return null;
    }

    return {
      ...employee,

      workplaceIds:
        Array.isArray(
          employee.workplaceIds
        )
          ? employee.workplaceIds.map(
              String
            )
          : [],

      workplaceNames:
        Array.isArray(
          employee.workplaceNames
        )
          ? employee.workplaceNames
          : [],
    };
  } catch (error) {
    console.error(
      "직원 상세 정보 조회 실패:",
      error
    );

    alert(
      `직원 정보를 불러오지 못했습니다.\n${
        error.message ||
        "관리자 권한을 확인해 주세요."
      }`
    );

    return null;
  }
}

function getEmployeeStatusText(status) {
  if (status === "active") {
    return "재직(활성)";
  }

  if (status === "pending") {
    return "승인 대기";
  }

  if (status === "inactive") {
    return "비활성";
  }

  if (status === "resigned") {
    return "퇴사";
  }

  if (status === "deleted") {
    return "삭제 처리";
  }

  return status || "상태 미지정";
}

function renderEmployeeWorkplaces(
  workplaceNames
) {
  if (!detailRegionList) return;

  detailRegionList.replaceChildren();

  if (!workplaceNames.length) {
    const emptyChip =
      document.createElement("span");

    emptyChip.className =
      "employee-region-chip empty";

    emptyChip.textContent =
      "배정된 근무지역 없음";

    detailRegionList.appendChild(
      emptyChip
    );

    return;
  }

  workplaceNames.forEach(
    (workplaceName) => {
      const workplaceChip =
        document.createElement("span");

      workplaceChip.className =
        "employee-region-chip";

      workplaceChip.textContent =
        `📍 ${workplaceName}`;

      detailRegionList.appendChild(
        workplaceChip
      );
    }
  );
}

function renderProfileUI(employee) {
  if (!employee) return;

  const employeeName =
    employee.name || "이름 없음";

  const department =
    employee.department || "소속 미배정";

  const position =
    employee.position || "직급 미지정";

  const workplaceNames =
    Array.isArray(employee.workplaceNames)
      ? employee.workplaceNames
      : [];

  if (employeeDetailTitle) {
    employeeDetailTitle.textContent =
      `${employeeName} · 근태 상세`;
  }

  if (detailName) {
    detailName.textContent =
      employeeName;
  }

  if (detailInfo) {
    detailInfo.textContent =
      `${department} · ${position} · ${getEmployeeStatusText(
        employee.status
      )}`;
  }

  if (detailPhone) {
    detailPhone.textContent =
      employee.phone || "—";
  }

  const roleText =
    employee.app_role ===
    "team_lead"
      ? "팀장"
      : "사원";

  if (detailAppRole) {
    detailAppRole.textContent =
      roleText;
  }

  if (detailAppApproval) {
    const approvalText = {
      not_requested: "로그인 전",
      pending: "승인 대기",
      approved: "승인 완료",
      rejected: "승인 거절",
    };

    detailAppApproval.textContent =
      approvalText[
        employee.app_approval_status
      ] || "로그인 전";
  }

  if (detailJoinDate) {
    detailJoinDate.textContent =
      employee.created_at
        ? employee.created_at.split("T")[0]
        : "—";
  }

  if (detailStatus) {
    detailStatus.textContent =
      getEmployeeStatusText(
        employee.status
      );
  }

  renderEmployeeWorkplaces(
    workplaceNames
  );

  updateAccountStatusButton();
}

async function fetchAndRenderAttendance() {
  let startDate = "";
  let endDate = "";

  if (viewMode === "monthly") {
    const lastDay =
      new Date(
        selectedYear,
        selectedMonth + 1,
        0
      ).getDate();

    startDate = toLocalDateKey(
      selectedYear,
      selectedMonth,
      1
    );

    endDate = toLocalDateKey(
      selectedYear,
      selectedMonth,
      lastDay
    );

    currentTimeDisplay.textContent =
      `${selectedYear}년 ${
        selectedMonth + 1
      }월`;
  } else if (viewMode === "yearly") {
    startDate =
      `${selectedYear}-01-01`;

    endDate =
      `${selectedYear}-12-31`;

    currentTimeDisplay.textContent =
      `${selectedYear}년 연간 근무표`;
  } else {
    startDate =
      attendanceStartDate.value;

    endDate =
      attendanceEndDate.value;

    if (!startDate || !endDate) {
      return;
    }
  }

  try {
    const [
      attendanceResult,
      noteResult,
    ] = await Promise.all([
      supabase
        .from("attendance")
        .select("*")
        .eq("user_id", targetUserId)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", {
          ascending: true,
        }),

      supabase
        .from("employee_daily_notes")
        .select(`
          note_date,
          content,
          day_type
        `)
        .eq("user_id", targetUserId)
        .gte("note_date", startDate)
        .lte("note_date", endDate)
        .order("note_date", {
          ascending: true,
        }),
    ]);

    if (attendanceResult.error) {
      throw attendanceResult.error;
    }

    if (noteResult.error) {
      throw noteResult.error;
    }

    currentAttendanceRecords =
      attendanceResult.data || [];

    dailyNotes = new Map(
      (noteResult.data || []).map(
        (note) => [
          note.note_date,
          {
            content:
              note.content || "",

            dayType:
              note.day_type ||
              "normal",
          },
        ]
      )
    );

    updateSummaryStats(
      currentAttendanceRecords
    );

    renderAttendanceTable(
      currentAttendanceRecords
    );

    toggleAttendanceRowsBtn
  ?.addEventListener(
    "click",
    () => {
      attendanceExpanded =
        !attendanceExpanded;

      renderAttendanceTable(
        currentAttendanceRecords
      );
    }
  );

    syncDailyNoteEditor();
  } catch (error) {
    console.error(
      "출근부 조회 실패:",
      error
    );

    alert(
      `출근부를 불러오지 못했습니다.\n${
        error.message || ""
      }`
    );
  }
}

function updateSummaryStats(list) {
  let totalDays = list.length;
  let lateCount = 0;
  let absentCount = 0;
  let totalMinutes = 0;

  list.forEach((item) => {
    if (item.status === "late" || item.status === "지각") lateCount++;
    if (item.status === "absent" || item.status === "미출근") absentCount++;
    totalMinutes += calcWorkMinutes(item.check_in_time, item.check_out_time);
  });

  if (statWorkDays) statWorkDays.textContent = totalDays;
  if (statLateCount) statLateCount.textContent = lateCount;
  if (statAbsentCount) statAbsentCount.textContent = absentCount;
  if (statWorkHours) statWorkHours.textContent = Math.floor(totalMinutes / 60);
}

function getRecentAttendanceDateKeys(
  displayRows
) {
  const today = new Date();

  const todayKey =
    `${today.getFullYear()}-` +
    `${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-` +
    `${String(
      today.getDate()
    ).padStart(2, "0")}`;

  const rowsUntilToday =
    displayRows.filter(
      (row) =>
        row.dateKey <= todayKey
    );

  const recentRows =
    rowsUntilToday.length
      ? rowsUntilToday.slice(-5)
      : displayRows.slice(0, 5);

  return new Set(
    recentRows.map(
      (row) => row.dateKey
    )
  );
}

function updateAttendanceToggleButton(
  totalRows
) {
  if (!toggleAttendanceRowsBtn) {
    return;
  }

  if (totalRows <= 5) {
    toggleAttendanceRowsBtn.hidden =
      true;

    return;
  }

  toggleAttendanceRowsBtn.hidden =
    false;

  toggleAttendanceRowsBtn.textContent =
    attendanceExpanded
      ? "최근 5일만 보기"
      : "전체 월 보기";
}

function renderAttendanceTable(
  records
) {
  if (!detailRecordTableBody) {
    return;
  }

  let displayRows = [];

  if (viewMode === "monthly") {
    const recordMap = new Map(
      records.map((record) => [
        record.work_date,
        record,
      ])
    );

    const lastDay = new Date(
      selectedYear,
      selectedMonth + 1,
      0
    ).getDate();

    for (
      let day = 1;
      day <= lastDay;
      day += 1
    ) {
      const dateKey =
        toLocalDateKey(
          selectedYear,
          selectedMonth,
          day
        );

      displayRows.push({
        dateKey,
        record:
          recordMap.get(dateKey) ||
          null,
      });
    }
  } else {
    displayRows = records
      .map((record) => ({
        dateKey:
          record.work_date,

        record,
      }))
      .sort(
        (a, b) =>
          a.dateKey.localeCompare(
            b.dateKey
          )
      );
  }

  if (!displayRows.length) {
    detailRecordTableBody.innerHTML = `
      <tr>
        <td colspan="6">
          조회된 기록이 없습니다.
        </td>
      </tr>
    `;

    updateAttendanceToggleButton(0);
    return;
  }

  const recentDateKeys =
    getRecentAttendanceDateKeys(
      displayRows
    );

  detailRecordTableBody.innerHTML =
    displayRows
      .map(({ dateKey, record }) => {
        const date = new Date(
          `${dateKey}T00:00:00`
        );

        const noteData =
          dailyNotes.get(dateKey) || {
            content: "",
            dayType: "normal",
          };

        const isAnnualLeave =
          noteData.dayType ===
          "annual_leave";

        const isCollapsed =
          !attendanceExpanded &&
          !recentDateKeys.has(
            dateKey
          );

        const rowClasses = [];

        if (isAnnualLeave) {
          rowClasses.push(
            "annual-leave-row"
          );
        }

        if (isCollapsed) {
          rowClasses.push(
            "attendance-collapsed-row"
          );
        }

        const dayText = String(
          date.getDate()
        ).padStart(2, "0");

        const monthText =
          date.getMonth() + 1;

        const checkIn =
          record?.check_in_time
            ? formatTimeOnly(
                record.check_in_time
              )
            : "";

        const checkOut =
          record?.check_out_time
            ? formatTimeOnly(
                record.check_out_time
              )
            : "";

        const workTime =
          isAnnualLeave
            ? "연차"
            : checkIn || checkOut
              ? `${
                  checkIn || "—"
                } - ${
                  checkOut || "—"
                }`
              : "";

        const workMinutes =
          record &&
          !isAnnualLeave
            ? calcWorkMinutes(
                record.check_in_time,
                record.check_out_time
              )
            : 0;

        const workTimeText =
          workMinutes > 0
            ? formatMinutesToHoursText(
                workMinutes
              )
            : "";

        return `
          <tr class="${rowClasses.join(" ")}">
            <td>
              <strong>
                ${date.getMonth() + 1}.${dayText}
              </strong>
            </td>

            <td>
              ${getKoreanDayOfWeek(dateKey)}
            </td>

            <td>
              ${
                isAnnualLeave
                  ? `
                    <strong class="annual-leave-text">
                      연차
                    </strong>
                  `
                  : escapeHtml(workTime)
              }
            </td>

            <td>
              ${escapeHtml(workTimeText)}
            </td>

            <td class="daily-note-cell">
              ${escapeHtml(noteData.content)}
            </td>

            <td class="attendance-edit-control">
              ${
                isAnnualLeave
                  ? "—"
                  : `
                    <button
                      type="button"
                      class="detail-attendance-edit-btn"
                      data-attendance-edit-id="${record?.id || ""}"
                      data-attendance-edit-date="${dateKey}"
                    >
                      ${record?.id ? "수정" : "기록 추가"}
                    </button>
                  `
              }
            </td>
          </tr>
        `;
      })
      .join("");

  detailRecordTableBody
    .querySelectorAll(
      "[data-attendance-edit-date]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const params =
            new URLSearchParams({
              date:
                button.dataset
                  .attendanceEditDate,

              userId:
                targetUserId,

              returnTo:
                `admin-employee-detail.html?id=${targetUserId}`,
            });

          const attendanceId =
            button.dataset
              .attendanceEditId;

          if (attendanceId) {
            params.set(
              "attendanceId",
              attendanceId
            );
          }

          window.location.href =
            `admin-attendance-edit.html?${params.toString()}`;
        }
      );
    });

  updateAttendanceToggleButton(
    displayRows.length
  );
}

function renderMemoHistory() {
  if (!memoHistoryList || !currentEmployeeData) return;

  const rawMemo = currentEmployeeData.memo || "";
  if (!rawMemo.trim()) {
    memoHistoryList.innerHTML = `<p style="color:#64748b; font-size:13px; margin:0;">등록된 메모가 없습니다.</p>`;
    return;
  }

  const memoItems = rawMemo.split("===").filter((m) => m.trim().length > 0);

  memoHistoryList.innerHTML = memoItems
    .map((item) => {
      const lines = item.trim().split("\n");
      const dateLine = lines[0]; 
      const content = lines.slice(1).join("\n"); 

      return `
        <div class="memo-item">
          <div class="memo-item-top">
            <strong>🗓️ ${dateLine}</strong>
            <span>관리자 작성</span>
          </div>
          <div class="memo-item-content">${content || dateLine}</div>
        </div>
      `;
    })
    .join("");
}

async function handleSaveMemo() {
  const newText = newMemoInput?.value.trim();
  if (!newText) {
    alert("메모 내용을 입력해 주세요.");
    return;
  }

  const nowStr = new Date().toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const formattedNewMemo = `[${nowStr}]\n${newText}`;
  const updatedMemo = currentEmployeeData.memo ? `${formattedNewMemo}\n===\n${currentEmployeeData.memo}` : formattedNewMemo;

  saveMemoBtn.disabled = true;
  saveMemoBtn.textContent = "저장 중...";

  const { error } = await supabase
    .from("users")
    .update({ memo: updatedMemo, updated_at: new Date().toISOString() })
    .eq("id", targetUserId);

  saveMemoBtn.disabled = false;
  saveMemoBtn.textContent = "메모 작성 및 저장";

  if (error) {
    alert("메모 저장에 실패했습니다.");
    console.error(error);
  } else {
    alert("✅ 메모가 저장되었습니다.");
    newMemoInput.value = "";
    currentEmployeeData.memo = updatedMemo;
    renderMemoHistory();
  }
}

async function handleDeleteAccount() {
  if (!currentEmployeeData) return;

  const typedText = prompt(
    `${currentEmployeeData.name} 직원과 관련된 모든 데이터를 영구 삭제합니다.\n\n계속하려면 '삭제'라고 입력하세요.`
  );

  if (typedText === null) {
    return;
  }

  if (typedText.trim() !== "삭제") {
    alert(
      "'삭제'를 정확히 입력해야 합니다."
    );

    return;
  }

  const finalConfirmed = confirm(
    "출퇴근 기록, 요청, 근무지 배정, 로그인 세션을 모두 삭제합니다.\n이 작업은 복구할 수 없습니다.\n\n정말 삭제하시겠습니까?"
  );

  if (!finalConfirmed) {
    return;
  }

  btnDeleteAccount.disabled = true;
  btnDeleteAccount.textContent =
    "삭제 중...";

  try {
    const { error } =
      await supabase.rpc(
        "admin_delete_employee_permanently",
        {
          p_user_id: targetUserId,
          p_confirmation: "삭제",
        }
      );

    if (error) {
      throw error;
    }

    alert(
      "직원과 관련 데이터가 모두 삭제되었습니다."
    );

    location.replace(
      "admin-employees.html"
    );
  } catch (error) {
    console.error(
      "직원 영구 삭제 실패:",
      error
    );

    alert(
      `직원 삭제에 실패했습니다.\n${
        error.message || ""
      }`
    );

    btnDeleteAccount.disabled = false;
    btnDeleteAccount.textContent =
      "계정 삭제";
  }
}

function handlePrintTableOnly() {
  if (!currentEmployeeData) {
    return;
  }

  const daysInMonth =
    new Date(
      selectedYear,
      selectedMonth + 1,
      0
    ).getDate();

  /*
    A4 인쇄 가능 높이 중
    표 본문에 약 238mm 사용
  */
  const rowHeight =
    Math.min(
      8.5,
      238 / daysInMonth
    );

  document.documentElement
    .style.setProperty(
      "--print-row-height",
      `${rowHeight}mm`
    );

  const department =
    currentEmployeeData
      .department ||
    "소속 미지정";

  const employeeName =
    currentEmployeeData.name ||
    "이름 없음";

  if (printTitle) {
    printTitle.textContent =
      `${selectedYear}년 ${
        selectedMonth + 1
      }월 출근부`;
  }

  if (printSubtitle) {
    printSubtitle.textContent =
      `소속: ${department} | ` +
      `성명: ${employeeName}`;
  }

  window.print();
}

function openEmployeeEditModal() {
  if (
    !employeeEditModal ||
    !currentEmployeeData
  ) {
    return;
  }

  editEmployeeName.value =
    currentEmployeeData.name || "";

  editEmployeePhone.value =
    currentEmployeeData.phone || "";

  editEmployeeRole.value =
    currentEmployeeData.app_role ||
    "employee";

  editEmployeeDepartment.value =
    currentEmployeeData.department || "";

  employeeEditModal.classList.add(
    "open"
  );

  employeeEditModal.setAttribute(
    "aria-hidden",
    "false"
  );
}

function closeEmployeeEditModal() {
  employeeEditModal?.classList.remove(
    "open"
  );

  employeeEditModal?.setAttribute(
    "aria-hidden",
    "true"
  );
}

async function saveEmployeeProfile(
  event
) {
  event.preventDefault();

  const name =
    editEmployeeName.value.trim();

  const phone =
    editEmployeePhone.value.trim();

  const department =
    editEmployeeDepartment.value;

  const appRole =
    editEmployeeRole.value;

  if (!name || !phone) {
    alert(
      "직원명과 연락처를 모두 입력해 주세요."
    );

    return;
  }

  const saveButton =
    employeeEditForm.querySelector(
      'button[type="submit"]'
    );

  saveButton.disabled = true;
  saveButton.textContent =
    "저장 중...";

  try {
    const { error } =
      await supabase.rpc(
        "admin_update_employee_profile_v2",
        {
          p_user_id:
            targetUserId,

          p_name:
            name,

          p_phone:
            phone,

          p_department:
            department || "",

          p_app_role:
            appRole,
        }
      );

    if (error) {
      throw error;
    }

    /*
      저장된 정보를 서버에서 다시 조회한다.
      RPC 반환 형태와 관계없이 화면 직급이 확실하게 갱신된다.
    */
    const refreshedEmployee =
      await fetchEmployeeProfile();

    currentEmployeeData =
      refreshedEmployee || {
        ...currentEmployeeData,
        name,
        phone,
        department:
          department || null,
        app_role:
          appRole,
      };

    renderProfileUI(
      currentEmployeeData
    );

    closeEmployeeEditModal();

    alert(
      appRole === "team_lead"
        ? "직원 정보가 수정되고 팀장 직급이 부여되었습니다."
        : "직원 정보가 수정되고 사원 직급이 부여되었습니다."
    );
  } catch (error) {
    console.error(
      "직원 정보 수정 실패:",
      error
    );

    alert(
      `직원 정보 수정에 실패했습니다.\n${
        error.message || ""
      }`
    );
  } finally {
    saveButton.disabled = false;
    saveButton.textContent =
      "수정 저장";
  }
}

async function openRegionEditModal() {
  if (
    !regionEditModal ||
    !currentEmployeeData
  ) {
    return;
  }

  regionEditList.innerHTML =
    "근무지역을 불러오는 중입니다.";

  regionEditModal.classList.add(
    "open"
  );

  regionEditModal.setAttribute(
    "aria-hidden",
    "false"
  );

  const { data, error } =
    await supabase
      .from("workplaces")
      .select("id, name")
      .order("name", {
        ascending: true,
      });

  if (error) {
    regionEditList.textContent =
      "근무지역을 불러오지 못했습니다.";

    console.error(error);
    return;
  }

  const currentIds =
    Array.isArray(
      currentEmployeeData.workplaceIds
    )
      ? currentEmployeeData
          .workplaceIds
          .map(String)
      : [];

  regionEditList.innerHTML =
    (data || [])
      .map(
        (workplace, index) => {
          const workplaceId =
            String(workplace.id);

          return `
            <div class="detail-region-option">
              <input
                id="detailRegion${index}"
                type="checkbox"
                name="detailRegion"
                value="${workplaceId}"
                ${
                  currentIds.includes(
                    workplaceId
                  )
                    ? "checked"
                    : ""
                }
              />

              <label for="detailRegion${index}">
                ${workplace.name}
              </label>
            </div>
          `;
        }
      )
      .join("");

  regionEditModal.dataset.workplaces =
    JSON.stringify(data || []);
}

function closeRegionEditModal() {
  regionEditModal?.classList.remove(
    "open"
  );

  regionEditModal?.setAttribute(
    "aria-hidden",
    "true"
  );
}

async function saveEmployeeRegions() {
  const selectedIds = [
    ...regionEditList.querySelectorAll(
      'input[name="detailRegion"]:checked'
    ),
  ].map((input) => input.value);

  regionEditSaveBtn.disabled = true;
  regionEditSaveBtn.textContent =
    "저장 중...";

  try {
    const { error } =
      await supabase.rpc(
        "admin_set_user_workplaces",
        {
          p_user_id: targetUserId,
          p_workplace_ids:
            selectedIds,
        }
      );

    if (error) {
      throw error;
    }

    const workplaces = JSON.parse(
      regionEditModal.dataset
        .workplaces || "[]"
    );

    currentEmployeeData.workplaceIds =
      selectedIds;

    currentEmployeeData.workplaceNames =
      workplaces
        .filter((workplace) =>
          selectedIds.includes(
            String(workplace.id)
          )
        )
        .map(
          (workplace) =>
            workplace.name
        );

    renderEmployeeWorkplaces(
      currentEmployeeData
        .workplaceNames
    );

    closeRegionEditModal();

    alert(
      "배정 지역이 수정되었습니다."
    );
  } catch (error) {
    console.error(
      "지역 배정 저장 실패:",
      error
    );

    alert(
      `지역 배정에 실패했습니다.\n${
        error.message || ""
      }`
    );
  } finally {
    regionEditSaveBtn.disabled =
      false;

    regionEditSaveBtn.textContent =
      "지역 배정 저장";
  }
}

editEmployeeBtn?.addEventListener(
  "click",
  openEmployeeEditModal
);

employeeEditCloseBtn?.addEventListener(
  "click",
  closeEmployeeEditModal
);

employeeEditCancelBtn?.addEventListener(
  "click",
  closeEmployeeEditModal
);

employeeEditForm?.addEventListener(
  "submit",
  saveEmployeeProfile
);

btnEditRegion?.addEventListener(
  "click",
  openRegionEditModal
);

regionEditCloseBtn?.addEventListener(
  "click",
  closeRegionEditModal
);

regionEditCancelBtn?.addEventListener(
  "click",
  closeRegionEditModal
);

regionEditSaveBtn?.addEventListener(
  "click",
  saveEmployeeRegions
);

btnDeactivate?.addEventListener(
  "click",
  toggleEmployeeStatus
);

btnDeleteAccount?.addEventListener(
  "click",
  handleDeleteAccount
);

function updateAccountStatusButton() {
  if (
    !btnDeactivate ||
    !currentEmployeeData
  ) {
    return;
  }

  const isActive =
    currentEmployeeData.status ===
    "active";

  btnDeactivate.textContent =
    isActive
      ? "계정 비활성화"
      : "계정 활성화";

  btnDeactivate.classList.toggle(
    "is-activate",
    !isActive
  );
}

async function toggleEmployeeStatus() {
  if (!currentEmployeeData) return;

  const isActive =
    currentEmployeeData.status ===
    "active";

  const nextStatus =
    isActive
      ? "inactive"
      : "active";

  const actionText =
    isActive
      ? "비활성화"
      : "활성화";

  const confirmed = confirm(
    `${currentEmployeeData.name} 직원을 ${actionText}하시겠습니까?`
  );

  if (!confirmed) return;

  btnDeactivate.disabled = true;

  try {
    const { data, error } =
      await supabase.rpc(
        "admin_set_employee_status",
        {
          p_user_id: targetUserId,
          p_status: nextStatus,
        }
      );

    if (error) {
      throw error;
    }

    currentEmployeeData.status =
      data;

    renderProfileUI(
      currentEmployeeData
    );

    updateAccountStatusButton();

    alert(
      `계정이 ${actionText}되었습니다.`
    );
  } catch (error) {
    console.error(
      "계정 상태 변경 실패:",
      error
    );

    alert(
      `상태 변경에 실패했습니다.\n${
        error.message || ""
      }`
    );
  } finally {
    btnDeactivate.disabled = false;
  }
}

function setupEventListeners() {
  /* 월간·연간·직접 기간 탭 */

  viewTabBtns.forEach((button) => {
    button.addEventListener(
      "click",
      async () => {
        viewTabBtns.forEach(
          (item) =>
            item.classList.remove(
              "active"
            )
        );

        button.classList.add(
          "active"
        );

        viewMode =
          button.dataset.mode;

        if (viewMode === "custom") {
          if (timeNavigator) {
            timeNavigator.style.display =
              "none";
          }

          if (customDateFilter) {
            customDateFilter.style.display =
              "flex";
          }

          return;
        }

        if (timeNavigator) {
          timeNavigator.style.display =
            "flex";
        }

        if (customDateFilter) {
          customDateFilter.style.display =
            "none";
        }

        attendanceExpanded = false;
        await fetchAndRenderAttendance();
      }
    );
  });


  /* 이전 기간 */

  prevTimeBtn?.addEventListener(
    "click",
    async () => {
      if (viewMode === "monthly") {
        selectedMonth -= 1;

        if (selectedMonth < 0) {
          selectedMonth = 11;
          selectedYear -= 1;
        }
      } else if (
        viewMode === "yearly"
      ) {
        selectedYear -= 1;
      }

      attendanceExpanded = false;
      await fetchAndRenderAttendance();
    }
  );


  /* 다음 기간 */

  nextTimeBtn?.addEventListener(
    "click",
    async () => {
      if (viewMode === "monthly") {
        selectedMonth += 1;

        if (selectedMonth > 11) {
          selectedMonth = 0;
          selectedYear += 1;
        }
      } else if (
        viewMode === "yearly"
      ) {
        selectedYear += 1;
      }

      attendanceExpanded = false;
      await fetchAndRenderAttendance();
    }
  );


  /* 직접 기간 조회 */

  attendanceSearchBtn?.addEventListener(
    "click",
    async () => {
      attendanceExpanded = false;
      await fetchAndRenderAttendance();
    }
  );


  /* 상단 월간 출근부 출력 */

  btnViewMonthly?.addEventListener(
    "click",
    async () => {
      viewMode = "monthly";

      viewTabBtns.forEach(
        (button) => {
          button.classList.toggle(
            "active",
            button.dataset.mode ===
              "monthly"
          );
        }
      );

      if (timeNavigator) {
        timeNavigator.style.display =
          "flex";
      }

      if (customDateFilter) {
        customDateFilter.style.display =
          "none";
      }

      attendanceExpanded = false;
      await fetchAndRenderAttendance();

      handlePrintTableOnly();
    }
  );


  /* 현재 표시된 출근부 출력 */

  btnExcelPrint?.addEventListener(
    "click",
    handlePrintTableOnly
  );


  /* 관리자 메모 저장 */

  dailyNoteDate?.addEventListener(
    "change",
    syncDailyNoteEditor
  );

  saveDailyNoteBtn?.addEventListener(
    "click",
    saveDailyNote
  );

  deleteDailyNoteBtn?.addEventListener(
    "click",
    deleteDailyNote
  );

  /* 모달 바깥 클릭 닫기 */

  employeeEditModal?.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        employeeEditModal
      ) {
        closeEmployeeEditModal();
      }
    }
  );

  regionEditModal?.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        regionEditModal
      ) {
        closeRegionEditModal();
      }
    }
  );


  /* ESC로 모달 닫기 */

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (
        employeeEditModal
          ?.classList
          .contains("open")
      ) {
        closeEmployeeEditModal();
        return;
      }

      if (
        regionEditModal
          ?.classList
          .contains("open")
      ) {
        closeRegionEditModal();
      }
    }
  );
}

function syncDailyNoteEditor() {
  if (
    !dailyNoteDate ||
    !dailyNoteInput ||
    !dailyNoteType
  ) {
    return;
  }

  if (!dailyNoteDate.value) {
    const today = new Date();

    const isCurrentMonth =
      today.getFullYear() ===
        selectedYear &&
      today.getMonth() ===
        selectedMonth;

    dailyNoteDate.value =
      isCurrentMonth
        ? toLocalDateKey(
            selectedYear,
            selectedMonth,
            today.getDate()
          )
        : toLocalDateKey(
            selectedYear,
            selectedMonth,
            1
          );
  }

  const noteData =
    dailyNotes.get(
      dailyNoteDate.value
    );

  dailyNoteInput.value =
    noteData?.content || "";

  dailyNoteType.value =
    noteData?.dayType ||
    "normal";
}

async function saveDailyNote() {
  const noteDate =
    dailyNoteDate.value;

  const content =
    dailyNoteInput.value.trim();

  const dayType =
    dailyNoteType.value ||
    "normal";

  if (!noteDate) {
    alert(
      "날짜를 선택해 주세요."
    );

    return;
  }

  if (
    dayType === "normal" &&
    !content
  ) {
    alert(
      "기타사항을 입력하거나 연차를 선택해 주세요."
    );

    return;
  }

  saveDailyNoteBtn.disabled = true;
  saveDailyNoteBtn.textContent =
    "저장 중...";

  try {
    const { error } =
      await supabase
        .from(
          "employee_daily_notes"
        )
        .upsert(
          {
            user_id:
              targetUserId,

            note_date:
              noteDate,

            day_type:
              dayType,

            content:
              content,

            updated_at:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              "user_id,note_date",
          }
        );

    if (error) {
      throw error;
    }

    dailyNotes.set(
      noteDate,
      {
        content,
        dayType,
      }
    );

    renderAttendanceTable(
      currentAttendanceRecords
    );

    alert(
      dayType === "annual_leave"
        ? "연차가 등록되었습니다."
        : "기타사항이 저장되었습니다."
    );
  } catch (error) {
    console.error(
      "기타사항 저장 실패:",
      error
    );

    alert(
      `저장에 실패했습니다.\n${
        error.message || ""
      }`
    );
  } finally {
    saveDailyNoteBtn.disabled =
      false;

    saveDailyNoteBtn.textContent =
      "기타사항 저장";

    dailyNoteType.value = "normal";
  }
}


async function deleteDailyNote() {
  const noteDate =
    dailyNoteDate.value;

  if (!noteDate) {
    return;
  }

  const confirmed = confirm(
    `${noteDate} 기타사항을 삭제하시겠습니까?`
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from("employee_daily_notes")
    .delete()
    .eq("user_id", targetUserId)
    .eq("note_date", noteDate);

  if (error) {
    alert(
      "기타사항을 삭제하지 못했습니다."
    );

    console.error(error);
    return;
  }

  dailyNotes.delete(noteDate);
  dailyNoteInput.value = "";

  renderAttendanceTable(
    currentAttendanceRecords
  );

  alert(
    "기타사항이 삭제되었습니다."
  );
}

async function init() {
  currentEmployeeData =
    await fetchEmployeeProfile();

  if (!currentEmployeeData) {
    return;
  }

  renderProfileUI(
    currentEmployeeData
  );

  setupEventListeners();

  const today = new Date();

  const todayStr =
    `${today.getFullYear()}-` +
    `${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-` +
    `${String(
      today.getDate()
    ).padStart(2, "0")}`;

  const firstDay =
    `${selectedYear}-` +
    `${String(
      selectedMonth + 1
    ).padStart(2, "0")}-01`;

  if (attendanceStartDate) {
    attendanceStartDate.value =
      firstDay;
  }

  if (attendanceEndDate) {
    attendanceEndDate.value =
      todayStr;
  }

  attendanceExpanded = false;
  await fetchAndRenderAttendance();
}

init();