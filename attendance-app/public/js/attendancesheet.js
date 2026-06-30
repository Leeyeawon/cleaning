/* =========================
  직원 앱 출근부
  - JS 자동 달력 생성
  - Supabase 연결 전 샘플 데이터 사용
========================= */

document.addEventListener("DOMContentLoaded", () => {
  initAttendanceSheet();
});

const today = new Date();

let currentYear = today.getFullYear();
let currentMonth = today.getMonth(); // 0 = 1월, 6 = 7월
let selectedDateKey = formatDateKey(today);

/* =========================
  임시 출근 데이터
  나중에 Supabase 데이터로 교체
========================= */

const attendanceRecords = {
  "2026-07-01": {
    status: "normal",
    checkIn: "09:02",
    checkOut: "18:04",
    region: "서면 B구역",
    totalTime: "9시간 2분",
  },
  "2026-07-02": {
    status: "normal",
    checkIn: "08:58",
    checkOut: "18:01",
    region: "서면 B구역",
    totalTime: "9시간 3분",
  },
  "2026-07-03": {
    status: "late",
    checkIn: "09:18",
    checkOut: "18:03",
    region: "해운대 A구역",
    totalTime: "8시간 45분",
  },
  "2026-07-06": {
    status: "normal",
    checkIn: "09:00",
    checkOut: "18:00",
    region: "서면 B구역",
    totalTime: "9시간",
  },
  "2026-07-07": {
    status: "normal",
    checkIn: "09:04",
    checkOut: "18:05",
    region: "해운대 A구역",
    totalTime: "9시간 1분",
  },
  "2026-07-08": {
    status: "normal",
    checkIn: "08:55",
    checkOut: "18:00",
    region: "서면 B구역",
    totalTime: "9시간 5분",
  },
  "2026-07-09": {
    status: "late",
    checkIn: "09:21",
    checkOut: "18:02",
    region: "서면 B구역",
    totalTime: "8시간 41분",
  },
  "2026-07-10": {
    status: "normal",
    checkIn: "09:01",
    checkOut: "18:04",
    region: "해운대 A구역",
    totalTime: "9시간 3분",
  },
  "2026-07-13": {
    status: "normal",
    checkIn: "09:00",
    checkOut: "18:00",
    region: "서면 B구역",
    totalTime: "9시간",
  },
  "2026-07-14": {
    status: "absent",
    checkIn: "-",
    checkOut: "-",
    region: "서면 B구역",
    totalTime: "-",
  },
};

/* =========================
  초기 실행
========================= */

function initAttendanceSheet() {
  const prevMonthBtn = document.getElementById("prevMonthBtn");
  const nextMonthBtn = document.getElementById("nextMonthBtn");
  const todayBtn = document.getElementById("todayBtn");

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
      moveMonth(-1);
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
      moveMonth(1);
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener("click", () => {
      currentYear = today.getFullYear();
      currentMonth = today.getMonth();
      selectedDateKey = formatDateKey(today);
      renderCalendar();
    });
  }

  renderCalendar();
}

/* =========================
  월 이동
========================= */

function moveMonth(direction) {
  currentMonth += direction;

  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  }

  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }

  selectedDateKey = "";

  renderCalendar();
}

/* =========================
  달력 생성
========================= */

function renderCalendar() {
  const currentMonthElement = document.getElementById("currentMonth");
  const calendarGrid = document.getElementById("calendarGrid");

  if (!currentMonthElement || !calendarGrid) return;

  currentMonthElement.textContent = `${currentYear년} ${currentMonth + 1월}`;

  calendarGrid.innerHTML = "";

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();

  const startDay = firstDay.getDay();

  // 앞쪽 빈 칸 생성
  for (let i = 0; i < startDay; i++) {
    const emptyDay = document.createElement("button");
    emptyDay.className = "day empty";
    emptyDay.type = "button";
    calendarGrid.appendChild(emptyDay);
  }

  // 실제 날짜 생성
  for (let date = 1; date <= lastDate; date++) {
    const dateObject = new Date(currentYear, currentMonth, date);
    const dateKey = formatDateKey(dateObject);

    const dayButton = createDayButton(date, dateObject, dateKey);

    calendarGrid.appendChild(dayButton);
  }

  updateSummary();
  updateSelectedDetail();
}

/* =========================
  날짜 버튼 생성
========================= */

function createDayButton(date, dateObject, dateKey) {
  const dayButton = document.createElement("button");
  const record = attendanceRecords[dateKey];

  const isToday = dateKey === formatDateKey(today);
  const isSelected = dateKey === selectedDateKey;
  const dayOfWeek = dateObject.getDay();

  const status = getDateStatus(record, dateObject);

  dayButton.type = "button";
  dayButton.className = `day ${status}`;

  if (isToday) {
    dayButton.classList.add("today");
  }

  if (isSelected) {
    dayButton.classList.add("active");
  }

  dayButton.dataset.date = dateKey;

  dayButton.innerHTML = `
    <span class="day-number">${date}</span>
    <span class="day-status">${getStatusLabel(status, isToday)}</span>
  `;

  dayButton.addEventListener("click", () => {
    selectedDateKey = dateKey;

    document.querySelectorAll(".day").forEach((day) => {
      day.classList.remove("active");
    });

    dayButton.classList.add("active");
    updateSelectedDetail();
  });

  return dayButton;
}

/* =========================
  날짜 상태 계산
========================= */

function getDateStatus(record, dateObject) {
  const dateKey = formatDateKey(dateObject);
  const todayKey = formatDateKey(today);
  const dayOfWeek = dateObject.getDay();

  if (record) {
    return record.status;
  }

  // 토요일, 일요일은 휴무로 표시
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return "off";
  }

  // 오늘 이후 날짜는 예정
  if (dateKey > todayKey) {
    return "scheduled";
  }

  // 오늘 이전인데 기록이 없으면 미기록
  if (dateKey < todayKey) {
    return "missing";
  }

  return "scheduled";
}

function getStatusLabel(status, isToday) {
  if (isToday) return "오늘";

  const labels = {
    normal: "정상",
    late: "지각",
    absent: "결근",
    off: "휴무",
    missing: "미기록",
    scheduled: "예정",
  };

  return labels[status] || "예정";
}

/* =========================
  요약 카드 자동 계산
========================= */

function updateSummary() {
  const summaryCards = document.querySelectorAll(".summary-card strong");

  if (summaryCards.length < 4) return;

  let total = 0;
  let normal = 0;
  let late = 0;
  let absent = 0;

  Object.keys(attendanceRecords).forEach((dateKey) => {
    const [year, month] = dateKey.split("-").map(Number);

    if (year !== currentYear || month !== currentMonth + 1) return;

    const status = attendanceRecords[dateKey].status;

    if (status === "normal" || status === "late") {
      total += 1;
    }

    if (status === "normal") normal += 1;
    if (status === "late") late += 1;
    if (status === "absent") absent += 1;
  });

  summaryCards[0].textContent = `${total}일`;
  summaryCards[1].textContent = `${normal}일`;
  summaryCards[2].textContent = `${late}일`;
  summaryCards[3].textContent = `${absent}일`;
}

/* =========================
  선택 날짜 상세
========================= */

function updateSelectedDetail() {
  const title = document.querySelector(".detail-header h2");
  const badge = document.querySelector(".detail-badge");

  if (!title || !badge) return;

  if (!selectedDateKey) {
    const firstDateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
    selectedDateKey = firstDateKey;
  }

  const selectedDate = parseDateKey(selectedDateKey);
  const record = attendanceRecords[selectedDateKey];
  const status = getDateStatus(record, selectedDate);

  title.textContent = formatKoreanDate(selectedDate);

  badge.className = "detail-badge";
  badge.classList.add(getBadgeClass(status));
  badge.textContent = getDetailStatusLabel(status);

  if (record) {
    setDetailData(
      record.checkIn,
      record.checkOut,
      record.region,
      record.totalTime
    );
    return;
  }

  if (status === "off") {
    setDetailData("-", "-", "휴무일", "-");
    return;
  }

  if (status === "scheduled") {
    setDetailData("-", "-", "근무 예정", "-");
    return;
  }

  if (status === "missing") {
    setDetailData("-", "-", "확인 필요", "-");
    return;
  }

  setDetailData("-", "-", "-", "-");
}

function setDetailData(checkIn, checkOut, region, totalTime) {
  const items = document.querySelectorAll(".detail-item strong");

  if (items.length < 4) return;

  items[0].textContent = checkIn;
  items[1].textContent = checkOut;
  items[2].textContent = region;
  items[3].textContent = totalTime;
}

/* =========================
  상태 표시
========================= */

function getBadgeClass(status) {
  if (status === "late") return "late";
  if (status === "absent") return "absent";
  if (status === "missing") return "missing";
  if (status === "off") return "off";
  if (status === "scheduled") return "scheduled";

  return "normal";
}

function getDetailStatusLabel(status) {
  const labels = {
    normal: "정상",
    late: "지각",
    absent: "결근",
    off: "휴무",
    missing: "미기록",
    scheduled: "예정",
  };

  return labels[status] || "예정";
}

/* =========================
  날짜 유틸
========================= */

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function formatKoreanDate(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  const weekday = weekdayLabels[date.getDay()];

  return `${month}월 ${day}일 ${weekday요일}`;
}