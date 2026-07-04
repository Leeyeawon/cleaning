import supabase from "./supabase.js";

const attendanceList = document.getElementById("attendanceList");
const totalWorkDays = document.getElementById("totalWorkDays");
const doneCount = document.getElementById("doneCount");
const workingCount = document.getElementById("workingCount");

const currentMonth = document.getElementById("currentMonth");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const todayBtn = document.getElementById("todayBtn");
const monthPickerBtn = document.getElementById("monthPickerBtn");
const monthPicker = document.getElementById("monthPicker");

let selectedYear = new Date().getFullYear();
let selectedMonth = new Date().getMonth(); // 0~11
let currentUserId = null;
let monthlyRecords = [];

function updateMonthTitle() {
  const date = new Date(selectedYear, selectedMonth, 1);

  currentMonth.textContent = date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long"
  });

  monthPicker.value = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
}

function getMonthRange() {
  const start = new Date(selectedYear, selectedMonth, 1);
  const end = new Date(selectedYear, selectedMonth + 1, 1);

  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  return { startDate, endDate };
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

  updateMonthTitle();
  await loadMonthlyAttendance(currentUserId);
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

  updateMonthTitle();
  await loadMonthlyAttendance(currentUserId);
});

monthPickerBtn?.addEventListener("click", () => {
  monthPicker.showPicker?.();
  monthPicker.click();
});

monthPicker?.addEventListener("change", async () => {
  if (!monthPicker.value) return;

  const [year, month] = monthPicker.value.split("-").map(Number);

  selectedYear = year;
  selectedMonth = month - 1;

  updateMonthTitle();
  await loadMonthlyAttendance(currentUserId);
});

async function init() {
  currentUserId = await checkAccess();
  if (!currentUserId) return;

  updateMonthTitle();
  await loadMonthlyAttendance(currentUserId);
}

init();

function formatDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short"
  });
}

function formatTime(timeString) {
  if (!timeString) return "--:--";

  const date = new Date(timeString);

  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function checkAccess() {
  const localUserId = localStorage.getItem("employeeUserId");

  const {
    data: { user }
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

async function loadMonthlyAttendance(userId) {
  const { startDate, endDate } = getMonthRange();

  const { data, error } = await supabase
    .from("attendance")
    .select(`
      id,
      work_date,
      check_in_time,
      check_out_time,
      status,
      workplaces (
        name
      )
    `)
    .eq("user_id", userId)
    .gte("work_date", startDate)
    .lt("work_date", endDate)
    .order("work_date", { ascending: false });

  if (error) {
    console.error(error);
    alert("출근부를 불러오지 못했습니다.");
    return;
  }

  renderSummary(data || []);
  renderAttendanceList(data || []);
}

function renderSummary(records) {
  const total = records.length;
  const done = records.filter((item) => item.status === "done").length;
  const working = records.filter((item) => item.status === "working").length;

  if (totalWorkDays) totalWorkDays.textContent = `${total}일`;
  if (doneCount) doneCount.textContent = `${done}건`;
  if (workingCount) workingCount.textContent = `${working}건`;
}

function renderAttendanceList(records) {
  if (!attendanceList) return;

  if (records.length === 0) {
    attendanceList.innerHTML = `
      <div class="empty-card">
        이번 달 출근 기록이 없습니다.
      </div>
    `;
    return;
  }

  attendanceList.innerHTML = records
    .map((record) => {
      const workplaceName = record.workplaces?.name || "근무지 미지정";
      const statusText = record.status === "done" ? "근무 완료" : "근무 중";

      return `
        <article class="attendance-item">
          <div>
            <strong>${formatDate(record.work_date)}</strong>
            <p>${workplaceName}</p>
          </div>

          <div class="attendance-time">
            <p>출근 ${formatTime(record.check_in_time)}</p>
            <p>퇴근 ${formatTime(record.check_out_time)}</p>
          </div>

          <span class="status-badge ${
            record.status === "done" ? "success" : "neutral"
          }">${statusText}</span>
        </article>
      `;
    })
    .join("");
}

async function init() {
  const userId = await checkAccess();
  if (!userId) return;

  await loadMonthlyAttendance(userId);
}

init();