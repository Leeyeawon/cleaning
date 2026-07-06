import supabase from "./supabase.js";
import {
  getEmployeeSessionToken,
  getCurrentEmployee,
} from "./employeeAuth.js";

const totalWorkDays = document.getElementById("totalWorkDays");
const doneCount = document.getElementById("doneCount");
const currentMonth = document.getElementById("currentMonth");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const todayBtn = document.getElementById("todayBtn");
const monthPickerBtn = document.getElementById("monthPickerBtn");
const monthPicker = document.getElementById("monthPicker");
const calendarGrid = document.getElementById("calendarGrid");
const selectedDateTitle = document.getElementById("selectedDateTitle");
const selectedStatusBadge = document.getElementById("selectedStatusBadge");
const detailCheckIn = document.getElementById("detailCheckIn");
const detailCheckOut = document.getElementById("detailCheckOut");
const detailWorkTime = document.getElementById("detailWorkTime");

let selectedYear = new Date().getFullYear();
let selectedMonth = new Date().getMonth();
let selectedDate = toDateKey(new Date());
let currentEmployee = null;
let monthlyRecords = [];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTitle(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function formatTime(timeString) {
  if (!timeString) return "--:--";
  const date = new Date(timeString);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWorkTime(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "-";
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  
  const diffMs = end - start;
  if (diffMs <= 0) return "-";

  const totalMinutes = Math.floor(diffMs / 1000 / 60);
  const displayMinutes = Math.floor(totalMinutes / 30) * 30;
  if (displayMinutes < 30) return "30분 미만";

  const hours = Math.floor(displayMinutes / 60);
  const minutes = displayMinutes % 60;
  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

function getMonthRange() {
  const start = new Date(selectedYear, selectedMonth, 1);
  const end = new Date(selectedYear, selectedMonth + 1, 0);
  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end),
  };
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function updateMonthTitle() {
  if (currentMonth) {
    currentMonth.textContent = `${selectedYear}년 ${selectedMonth + 1}월`;
  }
  if (monthPicker) {
    monthPicker.value = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
  }
}

function getRecordByDate(dateKey) {
  return monthlyRecords.find((record) => record.work_date === dateKey);
}

// 상태별 색상 (정상: 파랑, 지각: 빨강, 기타: 노랑)
function getRecordStatus(record) {
  if (!record) {
    return { text: "기록 없음", className: "detail-badge", dayClass: "" };
  }
  const status = record.status;
  if (["done", "normal", "complete", "completed", "working", "퇴근완료"].includes(status)) {
    return { text: "정상 출퇴근", className: "detail-badge normal", dayClass: "normal" };
  }
  if (["late", "delay", "지각"].includes(status)) {
    return { text: "지각", className: "detail-badge late", dayClass: "late" };
  }
  return { text: status || "기타", className: "detail-badge etc", dayClass: "etc" };
}

function renderSummary(records) {
  const total = records.length;
  const done = records.filter((item) => 
    ["done", "normal", "complete", "completed", "working", "퇴근완료"].includes(item.status)
  ).length;

  if (totalWorkDays) totalWorkDays.textContent = `${total}일`;
  if (doneCount) doneCount.textContent = `${done}일`;
}

// 📅 달력 렌더링 함수 (어떤 상황에서도 무조건 실행되도록 보장!)
function renderCalendar() {
  if (!calendarGrid) return;

  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const todayKey = toDateKey(new Date());

  let calendarHTML = "";

  for (let i = 0; i < firstDay; i++) {
    calendarHTML += `<button class="calendar-day empty" type="button" disabled></button>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(selectedYear, selectedMonth, day);
    const dateKey = toDateKey(date);
    const record = getRecordByDate(dateKey);
    const status = getRecordStatus(record);

    const classes = [
      "calendar-day",
      status.dayClass,
      dateKey === selectedDate ? "selected" : ""
    ].filter(Boolean).join(" ");

    const numberClass = dateKey === todayKey ? "today-number" : "day-number";

    calendarHTML += `
      <button class="${classes}" type="button" data-date="${dateKey}">
        <span class="${numberClass}">${day}</span>
      </button>
    `;
  }

  calendarGrid.innerHTML = calendarHTML;

  calendarGrid.querySelectorAll(".calendar-day[data-date]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDate = button.dataset.date;
      renderCalendar();
      renderSelectedDateDetail();
    });
  });
}

function renderSelectedDateDetail() {
  const record = getRecordByDate(selectedDate);
  const status = getRecordStatus(record);

  if (selectedDateTitle) selectedDateTitle.textContent = formatDateTitle(selectedDate);
  if (selectedStatusBadge) {
    selectedStatusBadge.textContent = status.text;
    selectedStatusBadge.className = status.className;
  }

  if (!record) {
    if (detailCheckIn) detailCheckIn.textContent = "--:--";
    if (detailCheckOut) detailCheckOut.textContent = "--:--";
    if (detailWorkTime) detailWorkTime.textContent = "-";
    return;
  }

  if (detailCheckIn) detailCheckIn.textContent = formatTime(record.check_in_time);
  if (detailCheckOut) detailCheckOut.textContent = formatTime(record.check_out_time);
  if (detailWorkTime) {
    detailWorkTime.textContent = formatWorkTime(record.check_in_time, record.check_out_time);
  }
}

// Supabase DB 조회 (실패해도 달력은 그리도록 구조 수정!)
async function loadMonthlyAttendance() {
  const token = getEmployeeSessionToken();
  if (!token) {
    location.href = "../employee/login.html";
    return;
  }

  const { startDate, endDate } = getMonthRange();

  try {
    const { data, error } = await supabase.rpc("get_my_monthly_attendance", {
      p_session_token: token,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      console.warn("⚠️ DB 출근부를 불러오지 못해 빈 달력을 표시합니다:", error.message);
      monthlyRecords = [];
    } else {
      monthlyRecords = data || [];
    }
  } catch (err) {
    console.error("통신 오류:", err);
    monthlyRecords = [];
  } finally {
    // 🔥 DB 성공/실패 여부와 상관없이 무조건 화면 요약과 달력을 렌더링!
    renderSummary(monthlyRecords);
    renderCalendar();
    renderSelectedDateDetail();
  }
}

async function changeMonth(diff) {
  selectedMonth += diff;
  if (selectedMonth < 0) {
    selectedYear -= 1;
    selectedMonth = 11;
  } else if (selectedMonth > 11) {
    selectedYear += 1;
    selectedMonth = 0;
  }
  selectedDate = toDateKey(new Date(selectedYear, selectedMonth, 1));
  updateMonthTitle();
  await loadMonthlyAttendance();
}

prevMonthBtn?.addEventListener("click", () => changeMonth(-1));
nextMonthBtn?.addEventListener("click", () => changeMonth(1));

todayBtn?.addEventListener("click", async () => {
  const today = new Date();
  selectedYear = today.getFullYear();
  selectedMonth = today.getMonth();
  selectedDate = toDateKey(today);
  updateMonthTitle();
  await loadMonthlyAttendance();
});

monthPickerBtn?.addEventListener("click", () => {
  if (!monthPicker) return;
  if (typeof monthPicker.showPicker === "function") {
    monthPicker.showPicker();
  } else {
    monthPicker.click();
  }
});

monthPicker?.addEventListener("change", async () => {
  if (!monthPicker.value) return;
  const [year, month] = monthPicker.value.split("-").map(Number);
  selectedYear = year;
  selectedMonth = month - 1;
  selectedDate = toDateKey(new Date(selectedYear, selectedMonth, 1));
  updateMonthTitle();
  await loadMonthlyAttendance();
});

async function init() {
  currentEmployee = await getCurrentEmployee();
  if (!currentEmployee) return;

  selectedDate = toDateKey(new Date());
  updateMonthTitle();

  // 🔥 DB 조회를 기다리기 전에 "빈 달력"부터 0.1초 만에 화면에 먼저 렌더링!
  renderCalendar();
  renderSelectedDateDetail();

  // 그 후 DB에서 실제 출근 데이터를 가져와 색칠!
  await loadMonthlyAttendance();
}

init();