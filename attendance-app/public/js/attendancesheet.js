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

  // 화면 표시용: 30분 단위 내림
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
  const end = new Date(selectedYear, selectedMonth + 1, 1);

  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end),
  };
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function updateMonthTitle() {
  const date = new Date(selectedYear, selectedMonth, 1);

  if (currentMonth) {
    currentMonth.textContent = date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
    });
  }

  if (monthPicker) {
    monthPicker.value = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
  }
}

function getRecordByDate(dateKey) {
  return monthlyRecords.find((record) => record.work_date === dateKey);
}

function getRecordStatus(record) {
  if (!record) {
    return {
      text: "기록 없음",
      className: "detail-badge",
      dayClass: "",
    };
  }

  if (
    record.status === "done" ||
    record.status === "normal" ||
    record.status === "complete" ||
    record.status === "completed"
  ) {
    return {
      text: "정상 출퇴근",
      className: "detail-badge normal",
      dayClass: "normal",
    };
  }

  if (
    record.status === "late" ||
    record.status === "delay"
  ) {
    return {
      text: "지각",
      className: "detail-badge late",
      dayClass: "late",
    };
  }

  return {
    text: "기타",
    className: "detail-badge etc",
    dayClass: "etc",
  };
}

function renderSummary(records) {
  const total = records.length;

  const done = records.filter((item) => {
    return (
      item.status === "done" ||
      item.status === "normal" ||
      item.status === "complete" ||
      item.status === "completed"
    );
  }).length;

  if (totalWorkDays) totalWorkDays.textContent = `${total}일`;
  if (doneCount) doneCount.textContent = `${done}일`;
}

function renderCalendar() {
  if (!calendarGrid) return;

  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const todayKey = toDateKey(new Date());

  let calendarHTML = "";

  // 1일 전 빈칸
  for (let i = 0; i < firstDay; i += 1) {
    calendarHTML += `
      <button class="calendar-day empty" type="button" disabled></button>
    `;
  }

  // 실제 날짜
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(selectedYear, selectedMonth, day);
    const dateKey = toDateKey(date);
    const record = getRecordByDate(dateKey);
    const status = getRecordStatus(record);

    const classes = [
      "calendar-day",
      record ? status.dayClass : "",
      dateKey === selectedDate ? "selected" : "",
    ]
      .filter(Boolean)
      .join(" ");

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

  if (selectedDateTitle) {
    selectedDateTitle.textContent = formatDateTitle(selectedDate);
  }

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
    detailWorkTime.textContent = formatWorkTime(
      record.check_in_time,
      record.check_out_time
    );
  }
}

async function checkAccess() {
  const employee = await getCurrentEmployee();

  if (!employee) return null;

  return employee;
}

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || localUserId;

  if (!userId) {
    location.href = "../employee/login.html";
    return null;
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, status")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    location.href = "../employee/login.html";
    return null;
  }

  if (profile.status === "pending") {
    location.href = "../employee/pending.html";
    return null;
  }

  if (profile.status !== "active") {
    alert("사용할 수 없는 계정입니다.");
    location.href = "../employee/login.html";
    return null;
  }

  return profile.id;
}

async function loadMonthlyAttendance() {
  const token = getEmployeeSessionToken();

  if (!token) {
    location.href = "../employee/login.html";
    return;
  }

  const { startDate, endDate } = getMonthRange();

  const { data, error } = await supabase.rpc("get_my_monthly_attendance", {
    p_session_token: token,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    console.error("출근부 조회 오류:", error);
    alert("출근부를 불러오지 못했습니다.");
    return;
  }

  monthlyRecords = data || [];

  renderSummary(monthlyRecords);
  renderCalendar();
  renderSelectedDateDetail();
}

async function changeMonth(diff) {
  selectedMonth += diff;

  if (selectedMonth < 0) {
    selectedYear -= 1;
    selectedMonth = 11;
  }

  if (selectedMonth > 11) {
    selectedYear += 1;
    selectedMonth = 0;
  }

  selectedDate = toDateKey(new Date(selectedYear, selectedMonth, 1));

  updateMonthTitle();
  await loadMonthlyAttendance();
}

prevMonthBtn?.addEventListener("click", () => {
  changeMonth(-1);
});

nextMonthBtn?.addEventListener("click", () => {
  changeMonth(1);
});

todayBtn?.addEventListener("click", async () => {
  const today = new Date();

  selectedYear = today.getFullYear();
  selectedMonth = today.getMonth();
  selectedDate = toDateKey(today);

  updateMonthTitle();
  await loadMonthlyAttendance();await loadMonthlyAttendance();
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
  currentEmployee = await checkAccess();

  if (!currentEmployee) return;

  selectedDate = toDateKey(new Date());

  updateMonthTitle();
  await loadMonthlyAttendance();
}

init();