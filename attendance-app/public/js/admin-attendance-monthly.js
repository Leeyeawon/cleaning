/* =========================
  월간 출근부 페이지
========================= */

const monthlyRecords = [
  {
    date: "06.01",
    name: "박서연",
    team: "디자인팀",
    region: "서면 B구역",
    checkIn: "09:02",
    checkOut: "18:05",
    workHours: 8,
    workTimeText: "8시간 03분",
    status: "정상",
    statusType: "normal",
    memo: "-",
  },
  {
    date: "06.02",
    name: "박서연",
    team: "디자인팀",
    region: "서면 B구역",
    checkIn: "09:18",
    checkOut: "18:00",
    workHours: 7.7,
    workTimeText: "7시간 42분",
    status: "지각",
    statusType: "late",
    memo: "교통 지연",
  },
  {
    date: "06.03",
    name: "박서연",
    team: "디자인팀",
    region: "서면 B구역",
    checkIn: "—",
    checkOut: "—",
    workHours: 0,
    workTimeText: "—",
    status: "미출근",
    statusType: "absent",
    memo: "연락 완료, 병가",
  },
  {
    date: "06.04",
    name: "정하윤",
    team: "운영팀",
    region: "해운대 A구역",
    checkIn: "09:11",
    checkOut: "18:03",
    workHours: 7.9,
    workTimeText: "7시간 52분",
    status: "지각",
    statusType: "late",
    memo: "버스 배차 지연",
  },
  {
    date: "06.05",
    name: "정하윤",
    team: "운영팀",
    region: "해운대 A구역",
    checkIn: "08:55",
    checkOut: "18:02",
    workHours: 8.1,
    workTimeText: "8시간 07분",
    status: "정상",
    statusType: "normal",
    memo: "현장 이동 지원",
  },
  {
    date: "06.06",
    name: "한지우",
    team: "현장팀",
    region: "남포동 C구역",
    checkIn: "09:07",
    checkOut: "18:01",
    workHours: 7.9,
    workTimeText: "7시간 54분",
    status: "지각",
    statusType: "late",
    memo: "관리자 확인",
  },
  {
    date: "06.07",
    name: "한지우",
    team: "현장팀",
    region: "남포동 C구역",
    checkIn: "08:58",
    checkOut: "18:04",
    workHours: 8.1,
    workTimeText: "8시간 06분",
    status: "정상",
    statusType: "normal",
    memo: "-",
  },
  {
    date: "06.08",
    name: "이민준",
    team: "현장팀",
    region: "서면 B구역",
    checkIn: "08:58",
    checkOut: "18:02",
    workHours: 8.1,
    workTimeText: "8시간 04분",
    status: "위치오류",
    statusType: "location",
    memo: "지정 위치와 320m 차이, 관리자 확인",
  },
];

const employeeFilter = document.getElementById("employeeFilter");
const regionFilter = document.getElementById("regionFilter");
const monthlySearchInput = document.getElementById("monthlySearchInput");
const monthlyTableBody = document.getElementById("monthlyTableBody");
const monthlyTableTitle = document.getElementById("monthlyTableTitle");

const summaryWorkDays = document.getElementById("summaryWorkDays");
const summaryLateCount = document.getElementById("summaryLateCount");
const summaryAbsentCount = document.getElementById("summaryAbsentCount");
const summaryWorkHours = document.getElementById("summaryWorkHours");
const summaryAverageTime = document.getElementById("summaryAverageTime");

const employeeDetailEmpty = document.getElementById("employeeDetailEmpty");
const employeeDetailContent = document.getElementById("employeeDetailContent");
const detailAvatar = document.getElementById("detailAvatar");
const detailName = document.getElementById("detailName");
const detailInfo = document.getElementById("detailInfo");
const detailWorkDays = document.getElementById("detailWorkDays");
const detailLateCount = document.getElementById("detailLateCount");
const detailAbsentCount = document.getElementById("detailAbsentCount");
const detailWorkHours = document.getElementById("detailWorkHours");
const recentMemoList = document.getElementById("recentMemoList");
const monthlyDownloadBtn = document.getElementById("monthlyDownloadBtn");

function getStatusClass(statusType) {
  if (statusType === "late") return "late";
  if (statusType === "absent") return "absent";
  if (statusType === "location") return "location";
  return "normal";
}

function filterMonthlyRecords() {
  const selectedEmployee = employeeFilter ? employeeFilter.value : "all";
  const selectedRegion = regionFilter ? regionFilter.value : "all";
  const searchKeyword = monthlySearchInput
    ? monthlySearchInput.value.trim()
    : "";

  return monthlyRecords.filter((record) => {
    const employeeMatched =
      selectedEmployee === "all" || record.name === selectedEmployee;

    const regionMatched =
      selectedRegion === "all" || record.region === selectedRegion;

    const searchMatched =
      searchKeyword === "" || record.name.includes(searchKeyword);

    return employeeMatched && regionMatched && searchMatched;
  });
}

function renderMonthlyTable(records) {
  if (!monthlyTableBody) return;

  if (records.length === 0) {
    monthlyTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-row">조회된 월간 출근 기록이 없습니다.</td>
      </tr>
    `;
    return;
  }

  monthlyTableBody.innerHTML = records
    .map((record) => {
      return `
        <tr>
          <td>${record.date}</td>
          <td>
            <div class="employee">
              <span class="avatar">${record.name.slice(0, 1)}</span>
              ${record.name}
            </div>
          </td>
          <td>${record.region}</td>
          <td>${record.checkIn}</td>
          <td>${record.checkOut}</td>
          <td>${record.workTimeText}</td>
          <td>
            <span class="status ${getStatusClass(record.statusType)}">
              ${record.status}
            </span>
          </td>
          <td class="memo-cell">${record.memo}</td>
        </tr>
      `;
    })
    .join("");
}

function updateSummary(records) {
  const workDays = records.filter((record) => record.checkIn !== "—").length;
  const lateCount = records.filter((record) => record.status === "지각").length;
  const absentCount = records.filter((record) => record.status === "미출근").length;
  const totalHours = records.reduce((sum, record) => sum + record.workHours, 0);

  const checkInTimes = records
    .filter((record) => record.checkIn !== "—")
    .map((record) => record.checkIn);

  const averageTime = getAverageCheckInTime(checkInTimes);

  summaryWorkDays.textContent = workDays;
  summaryLateCount.textContent = lateCount;
  summaryAbsentCount.textContent = absentCount;
  summaryWorkHours.textContent = Math.round(totalHours);
  summaryAverageTime.textContent = averageTime;
}

function getAverageCheckInTime(times) {
  if (times.length === 0) return "-";

  const totalMinutes = times.reduce((sum, time) => {
    const [hour, minute] = time.split(":").map(Number);
    return sum + hour * 60 + minute;
  }, 0);

  const averageMinutes = Math.round(totalMinutes / times.length);
  const hour = String(Math.floor(averageMinutes / 60)).padStart(2, "0");
  const minute = String(averageMinutes % 60).padStart(2, "0");

  return `${hour}:${minute}`;
}

function updateEmployeeDetail(records) {
  const selectedEmployee = employeeFilter ? employeeFilter.value : "all";

  if (selectedEmployee === "all") {
    employeeDetailEmpty.style.display = "block";
    employeeDetailContent.classList.remove("active");
    monthlyTableTitle.textContent = "전체 직원 월간 출근 기록";
    return;
  }

  const employeeRecords = monthlyRecords.filter(
    (record) => record.name === selectedEmployee
  );

  const firstRecord = employeeRecords[0];

  if (!firstRecord) {
    employeeDetailEmpty.style.display = "block";
    employeeDetailContent.classList.remove("active");
    return;
  }

  const workDays = employeeRecords.filter((record) => record.checkIn !== "—").length;
  const lateCount = employeeRecords.filter((record) => record.status === "지각").length;
  const absentCount = employeeRecords.filter((record) => record.status === "미출근").length;
  const totalHours = employeeRecords.reduce((sum, record) => sum + record.workHours, 0);

  employeeDetailEmpty.style.display = "none";
  employeeDetailContent.classList.add("active");

  monthlyTableTitle.textContent = `${selectedEmployee} 월간 출근 기록`;
  detailAvatar.textContent = selectedEmployee.slice(0, 1);
  detailName.textContent = selectedEmployee;
  detailInfo.textContent = `${firstRecord.region} · ${firstRecord.team}`;

  detailWorkDays.textContent = `${workDays}일`;
  detailLateCount.textContent = `${lateCount}회`;
  detailAbsentCount.textContent = `${absentCount}회`;
  detailWorkHours.textContent = `${Math.round(totalHours)}시간`;

  const memos = employeeRecords
    .filter((record) => record.memo !== "-")
    .slice(0, 4);

  if (memos.length === 0) {
    recentMemoList.innerHTML = `<li>등록된 메모가 없습니다.</li>`;
    return;
  }

  recentMemoList.innerHTML = memos
    .map((record) => {
      return `<li>${record.date} · ${record.memo}</li>`;
    })
    .join("");
}

function updateMonthlyPage() {
  const filteredRecords = filterMonthlyRecords();

  renderMonthlyTable(filteredRecords);
  updateSummary(filteredRecords);
  updateEmployeeDetail(filteredRecords);
}

function handleDownload() {
  alert("엑셀 다운로드 기능은 나중에 Supabase 데이터 연결 후 구현하면 됩니다.");
}

function initMonthlyPage() {
  updateMonthlyPage();

  if (employeeFilter) {
    employeeFilter.addEventListener("change", updateMonthlyPage);
  }

  if (regionFilter) {
    regionFilter.addEventListener("change", updateMonthlyPage);
  }

  if (monthlySearchInput) {
    monthlySearchInput.addEventListener("input", updateMonthlyPage);
  }

  if (monthlyDownloadBtn) {
    monthlyDownloadBtn.addEventListener("click", handleDownload);
  }
}

initMonthlyPage();