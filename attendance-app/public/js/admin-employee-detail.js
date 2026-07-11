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
const detailLoginId = document.getElementById("detailLoginId");
const detailJoinDate = document.getElementById("detailJoinDate");
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
const btnResetPassword = document.getElementById("btnResetPassword");
const btnDeactivate = document.getElementById("btnDeactivate");
const btnDeleteAccount = document.getElementById("btnDeleteAccount");
const btnExcelPrint = document.getElementById("btnExcelPrint");

const newMemoInput = document.getElementById("newMemoInput");
const saveMemoBtn = document.getElementById("saveMemoBtn");
const memoHistoryList = document.getElementById("memoHistoryList");

const printTitle = document.getElementById("printTitle");
const printSubtitle = document.getElementById("printSubtitle");

const editEmployeeBtn = document.getElementById("editEmployeeBtn");
const btnEditRegion = document.getElementById("btnEditRegion");
const employeeEditModal = document.getElementById("employeeEditModal");
const employeeEditForm = document.getElementById("employeeEditForm");
const employeeEditCloseBtn = document.getElementById("employeeEditCloseBtn");
const employeeEditCancelBtn = document.getElementById("employeeEditCancelBtn");
const editEmployeeName = document.getElementById("editEmployeeName");
const editEmployeePhone = document.getElementById("editEmployeePhone");
const editEmployeeCode = document.getElementById("editEmployeeCode");
const editEmployeeDepartment = document.getElementById("editEmployeeDepartment");
const regionEditModal = document.getElementById("regionEditModal");
const regionEditList = document.getElementById("regionEditList");
const regionEditCloseBtn = document.getElementById("regionEditCloseBtn");
const regionEditCancelBtn = document.getElementById("regionEditCancelBtn");
const regionEditSaveBtn = document.getElementById("regionEditSaveBtn");

let currentEmployeeData = null;
let viewMode = "monthly"; 
let selectedYear = new Date().getFullYear();
let selectedMonth = new Date().getMonth(); 

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
        "admin_get_employees"
      );

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

  if (detailLoginId) {
    detailLoginId.textContent =
      employee.employee_code || "—";
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
    startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split("T")[0];
    endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split("T")[0];
    currentTimeDisplay.textContent = `${selectedYear}년 ${selectedMonth + 1}월`;
  } else if (viewMode === "yearly") {
    startDate = `${selectedYear}-01-01`;
    endDate = `${selectedYear}-12-31`;
    currentTimeDisplay.textContent = `${selectedYear}년 연간 근무표`;
  } else if (viewMode === "custom") {
    startDate = attendanceStartDate.value;
    endDate = attendanceEndDate.value;
    if (!startDate || !endDate) return;
  }

  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", targetUserId)
      .gte("work_date", startDate)
      .lte("work_date", endDate)
      .order("work_date", { ascending: true });

    if (error) {
      console.error("근태 조회 에러:", error);
      return;
    }

    const list = data || [];
    updateSummaryStats(list);
    renderAttendanceTable(list);
  } catch (err) {
    console.error("통신 오류:", err);
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

function renderAttendanceTable(list) {
  if (!detailRecordTableBody) return;

  if (list.length === 0) {
    detailRecordTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row" style="text-align:center; padding:30px; color:#888;">
          해당 기간에 조회된 출근 기록이 없습니다.
        </td>
      </tr>
    `;
    return;
  }

  detailRecordTableBody.innerHTML = list
    .map((item) => {
      const dateStr = item.work_date; 
      const dayOfWeek = getKoreanDayOfWeek(dateStr); 
      
      const inTime = formatTimeOnly(item.check_in_time);
      const outTime = formatTimeOnly(item.check_out_time);
      const workTimeRange = item.check_in_time ? `${inTime} - ${outTime}` : "—"; 

      const mins = calcWorkMinutes(item.check_in_time, item.check_out_time);
      const totalHoursText = formatMinutesToHoursText(mins); 

      let statusText = "정상";
      let statusColor = "#168a4a";
      if (item.status === "late" || item.status === "지각") { statusText = "지각"; statusColor = "#dc2626"; }
      else if (item.status === "absent" || item.status === "미출근") { statusText = "미출근"; statusColor = "#6b7280"; }
      else if (item.status === "location_error" || item.status === "위치오류") { statusText = "위치오류"; statusColor = "#d97706"; }

      const memoText = item.memo || "—"; 

      return `
        <tr>
          <td><strong>${dateStr}</strong></td>
          <td>${dayOfWeek}</td>
          <td>${workTimeRange}</td>
          <td>${totalHoursText}</td>
          <td>
            <span style="color:${statusColor}; font-weight:bold; background:#f3f4f6; padding:3px 8px; border-radius:6px; font-size:12px;">
              ${statusText}
            </span>
          </td>
          <td style="color:#4b5563; font-size:13px; text-align:left;">${memoText}</td>
        </tr>
      `;
    })
    .join("");
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
  if (!currentEmployeeData) return;

  let periodText = currentTimeDisplay ? currentTimeDisplay.textContent : "근무표";
  if (viewMode === "custom") {
    periodText = `${attendanceStartDate?.value} ~ ${attendanceEndDate?.value}`;
  }

  if (printTitle) {
    printTitle.textContent = `[${periodText}] ${currentEmployeeData.name} 근무표 (출근부)`;
  }

  if (printSubtitle) {
    const todayKo = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
    const workplaceText =
      Array.isArray(
        currentEmployeeData.workplaceNames
      ) &&
      currentEmployeeData.workplaceNames.length
        ? currentEmployeeData
            .workplaceNames
            .join(", ")
        : "미배정";

    printSubtitle.textContent =
      `출력일자: ${todayKo} | ` +
      `소속: ${
        currentEmployeeData.department ||
        "부서 없음"
      } | ` +
      `배정: ${workplaceText}`;
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

  editEmployeeCode.value =
    currentEmployeeData.employee_code || "";

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

  const employeeCode =
    editEmployeeCode.value.trim();

  const department =
    editEmployeeDepartment.value;

  if (
    !name ||
    !phone ||
    !employeeCode
  ) {
    alert(
      "직원명, 연락처, 로그인 ID를 모두 입력해 주세요."
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
    const { data, error } =
      await supabase.rpc(
        "admin_update_employee_profile",
        {
          p_user_id: targetUserId,
          p_name: name,
          p_phone: phone,
          p_employee_code:
            employeeCode,
          p_department:
            department || "",
        }
      );

    if (error) {
      throw error;
    }

    currentEmployeeData = {
      ...currentEmployeeData,
      ...data,
    };

    renderProfileUI(
      currentEmployeeData
    );

    closeEmployeeEditModal();

    alert(
      "직원 정보가 수정되었습니다."
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

async function init() {
  currentEmployeeData =
    await fetchEmployeeProfile();

  if (!currentEmployeeData) {
    return;
  }

  renderProfileUI(
    currentEmployeeData
  );

  renderMemoHistory();
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

  await fetchAndRenderAttendance();
}

init();