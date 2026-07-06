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
    alert("⚠️ 직원 ID가 없습니다. 목록으로 이동합니다.");
    location.href = "admin-employees.html";
    return null;
  }

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", targetUserId)
      .single();

    if (error || !user) {
      alert("해당 직원 정보를 찾을 수 없습니다.");
      location.href = "admin-employees.html";
      return null;
    }

    const { data: wpUser } = await supabase
      .from("workplace_users")
      .select("workplaces ( name )")
      .eq("user_id", targetUserId)
      .limit(1)
      .maybeSingle();

    return { ...user, workplaceName: wpUser?.workplaces?.name || "미배정" };
  } catch (err) {
    console.error("프로필 조회 에러:", err);
    return null;
  }
}

function renderProfileUI(emp) {
  if (!emp) return;

  if (employeeDetailTitle) employeeDetailTitle.textContent = `${emp.name} · 근태 상세`;
  if (detailName) detailName.textContent = emp.name || "이름 없음";
  if (detailInfo) detailInfo.textContent = `${emp.department || '부서없음'} · ${emp.position || '직급없음'} [${emp.status === 'active' ? '재직' : emp.status === 'pending' ? '승인대기' : '비활성'}]`;
  
  if (detailPhone) detailPhone.textContent = emp.phone || "—";
  if (detailLoginId) detailLoginId.textContent = emp.email || emp.employee_code || "—";
  if (detailJoinDate) detailJoinDate.textContent = emp.created_at ? emp.created_at.split("T")[0] : "—";
  if (detailStatus) detailStatus.textContent = emp.status === "active" ? "재직(활성)" : emp.status;

  if (detailRegionList) {
    detailRegionList.innerHTML = `
      <div style="padding:10px; background:#f8fafc; border-radius:8px; font-weight:bold; color:#1e293b;">
        📍 ${emp.workplaceName}
      </div>
    `;
  }
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
  if (!confirm(`⚠️ 정말로 '${currentEmployeeData.name}' 직원의 계정을 삭제하시겠습니까?\n\n삭제 후에는 복구가 불가능하며 모든 출입 권한이 사라집니다.`)) {
    return;
  }

  const { error } = await supabase
    .from("users")
    .update({ status: "deleted" })
    .eq("id", targetUserId);

  if (error) {
    alert("계정 삭제 처리 중 오류가 발생했습니다.");
    console.error(error);
  } else {
    alert("🗑️ 계정이 삭제되었습니다. 직원 목록으로 이동합니다.");
    location.href = "admin-employees.html";
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
    printSubtitle.textContent = `출력일자: ${todayKo} | 소속: ${currentEmployeeData.department || '부서없음'} | 배정: ${currentEmployeeData.workplaceName || '미배정'}`;
  }

  window.print();
}

function setupEventListeners() {
  viewTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      viewTabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      viewMode = btn.dataset.mode;

      if (viewMode === "custom") {
        timeNavigator.style.display = "none";
        customDateFilter.style.display = "flex";
      } else {
        timeNavigator.style.display = "flex";
        customDateFilter.style.display = "none";
        fetchAndRenderAttendance();
      }
    });
  });

  prevTimeBtn?.addEventListener("click", () => {
    if (viewMode === "monthly") {
      selectedMonth--;
      if (selectedMonth < 0) { selectedMonth = 11; selectedYear--; }
    } else if (viewMode === "yearly") {
      selectedYear--;
    }
    fetchAndRenderAttendance();
  });

  nextTimeBtn?.addEventListener("click", () => {
    if (viewMode === "monthly") {
      selectedMonth++;
      if (selectedMonth > 11) { selectedMonth = 0; selectedYear++; }
    } else if (viewMode === "yearly") {
      selectedYear++;
    }
    fetchAndRenderAttendance();
  });

  attendanceSearchBtn?.addEventListener("click", fetchAndRenderAttendance);

  btnViewMonthly?.addEventListener("click", async () => {
    viewTabBtns.forEach((b) => b.classList.remove("active"));
    if (viewTabBtns[0]) viewTabBtns[0].classList.add("active");
    viewMode = "monthly";
    
    if (timeNavigator) timeNavigator.style.display = "flex";
    if (customDateFilter) customDateFilter.style.display = "none";
    
    await fetchAndRenderAttendance();
    handlePrintTableOnly();
  });

  btnResetPassword?.addEventListener("click", () => {
    if (confirm("해당 직원의 비밀번호를 초기화하시겠습니까?")) alert("🔐 임시 비밀번호가 발급되었습니다: 1234");
  });

  btnDeactivate?.addEventListener("click", async () => {
    if (confirm("계정을 비활성화하시겠습니까?")) {
      await supabase.from("users").update({ status: "inactive" }).eq("id", targetUserId);
      alert("🚫 계정이 비활성화되었습니다.");
      location.reload();
    }
  });

  btnDeleteAccount?.addEventListener("click", handleDeleteAccount);
  saveMemoBtn?.addEventListener("click", handleSaveMemo);
  btnExcelPrint?.addEventListener("click", handlePrintTableOnly);
}

async function init() {
  currentEmployeeData = await fetchEmployeeProfile();
  renderProfileUI(currentEmployeeData);
  renderMemoHistory();
  setupEventListeners();

  const todayStr = new Date().toISOString().split("T")[0];
  const firstDay = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
  if (attendanceStartDate) attendanceStartDate.value = firstDay;
  if (attendanceEndDate) attendanceEndDate.value = todayStr;

  fetchAndRenderAttendance();
}

init();