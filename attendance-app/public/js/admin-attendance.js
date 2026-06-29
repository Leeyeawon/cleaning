/* =========================
  관리자 출퇴근관리 페이지
========================= */

const attendanceData = [
  {
    name: "이민준",
    region: "해운대 A구역",
    checkIn: "09:02",
    checkOut: "18:05",
    workTime: "8시간 03분",
    status: "퇴근완료",
    statusType: "normal",
  },
  {
    name: "박서연",
    region: "서면 B구역",
    checkIn: "09:18",
    checkOut: "—",
    workTime: "근무중",
    status: "지각",
    statusType: "late",
  },
  {
    name: "최준혁",
    region: "남포동 C구역",
    checkIn: "—",
    checkOut: "—",
    workTime: "—",
    status: "미출근",
    statusType: "absent",
  },
  {
    name: "김다은",
    region: "해운대 A구역",
    checkIn: "08:55",
    checkOut: "—",
    workTime: "근무중",
    status: "근무중",
    statusType: "normal",
  },
  {
    name: "정하윤",
    region: "서면 B구역",
    checkIn: "09:11",
    checkOut: "—",
    workTime: "근무중",
    status: "지각",
    statusType: "late",
  },
  {
    name: "한지우",
    region: "남포동 C구역",
    checkIn: "08:58",
    checkOut: "—",
    workTime: "근무중",
    status: "위치오류",
    statusType: "location",
  },
];

const lateEmployees = [
  {
    name: "박서연",
    info: "디자인팀 · 서면 B구역",
    count: 5,
  },
  {
    name: "정하윤",
    info: "운영팀 · 서면 B구역",
    count: 4,
  },
  {
    name: "한지우",
    info: "현장팀 · 남포동 C구역",
    count: 3,
  },
];

const todayDateElement = document.getElementById("todayDate");
const attendanceTableBody = document.getElementById("attendanceTableBody");
const regionFilter = document.getElementById("regionFilter");
const statusFilter = document.getElementById("statusFilter");
const employeeSearchInput = document.getElementById("employeeSearchInput");
const lateList = document.getElementById("lateList");
const excelDownloadBtn = document.getElementById("excelDownloadBtn");

function setTodayDate() {
  if (!todayDateElement) return;

  const today = new Date();

  const formattedDate = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });

  todayDateElement.textContent = `${formattedDate} 출퇴근 현황과 반복 지각 직원을 확인합니다.`;
}

function getStatusClass(statusType) {
  if (statusType === "late") return "late";
  if (statusType === "absent") return "absent";
  if (statusType === "location") return "location";
  return "normal";
}

function renderAttendanceTable(data) {
  if (!attendanceTableBody) return;

  if (data.length === 0) {
    attendanceTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">조회된 출퇴근 기록이 없습니다.</td>
      </tr>
    `;
    return;
  }

  attendanceTableBody.innerHTML = data
    .map((item) => {
      const firstName = item.name.slice(0, 1);
      const checkOutClass = item.checkOut === "—" ? "muted" : "";
      const workTimeClass = item.workTime === "—" ? "muted" : "";

      return `
        <tr>
          <td>
            <div class="employee">
              <span class="avatar">${firstName}</span>
              ${item.name}
            </div>
          </td>
          <td>${item.region}</td>
          <td>${item.checkIn}</td>
          <td class="${checkOutClass}">${item.checkOut}</td>
          <td class="${workTimeClass}">${item.workTime}</td>
          <td>
            <span class="status ${getStatusClass(item.statusType)}">
              ${item.status}
            </span>
          </td>
          <td>
            <button class="table-action-btn" type="button">상세</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderLateEmployees() {
  if (!lateList) return;

  lateList.innerHTML = lateEmployees
    .map((employee) => {
      return `
        <div class="late-item">
          <div>
            <strong>${employee.name}</strong>
            <p>${employee.info}</p>
          </div>
          <span>${employee.count}회</span>
        </div>
      `;
    })
    .join("");
}

function filterAttendanceData() {
  const selectedRegion = regionFilter ? regionFilter.value : "전체 지역";
  const selectedStatus = statusFilter ? statusFilter.value : "전체 상태";
  const searchKeyword = employeeSearchInput
    ? employeeSearchInput.value.trim()
    : "";

  const filteredData = attendanceData.filter((item) => {
    const isRegionMatched =
      selectedRegion === "전체 지역" || item.region === selectedRegion;

    const isStatusMatched =
      selectedStatus === "전체 상태" || item.status === selectedStatus;

    const isSearchMatched =
      searchKeyword === "" || item.name.includes(searchKeyword);

    return isRegionMatched && isStatusMatched && isSearchMatched;
  });

  renderAttendanceTable(filteredData);
}

function handleExcelDownload() {
  alert("엑셀 다운로드 기능은 나중에 Supabase 데이터 연결 후 구현하면 됩니다.");
}

function initAttendancePage() {
  setTodayDate();
  renderAttendanceTable(attendanceData);
  renderLateEmployees();

  if (regionFilter) {
    regionFilter.addEventListener("change", filterAttendanceData);
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", filterAttendanceData);
  }

  if (employeeSearchInput) {
    employeeSearchInput.addEventListener("input", filterAttendanceData);
  }

  if (excelDownloadBtn) {
    excelDownloadBtn.addEventListener("click", handleExcelDownload);
  }
}

initAttendancePage();