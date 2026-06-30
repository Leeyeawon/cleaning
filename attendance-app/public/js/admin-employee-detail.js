/* =========================
  직원 상세 페이지
========================= */

const urlParams = new URLSearchParams(window.location.search);
const employeeId = urlParams.get("id");

const employee = employees.find((item) => item.id === employeeId);

const employeeDetailTitle = document.getElementById("employeeDetailTitle");
const detailAvatar = document.getElementById("detailAvatar");
const detailName = document.getElementById("detailName");
const detailInfo = document.getElementById("detailInfo");
const detailPhone = document.getElementById("detailPhone");
const detailLoginId = document.getElementById("detailLoginId");
const detailJoinDate = document.getElementById("detailJoinDate");
const detailStatus = document.getElementById("detailStatus");
const detailRegionList = document.getElementById("detailRegionList");
const detailWorkDays = document.getElementById("detailWorkDays");
const detailLateCount = document.getElementById("detailLateCount");
const detailAbsentCount = document.getElementById("detailAbsentCount");
const detailWorkHours = document.getElementById("detailWorkHours");
const detailRecordTableBody = document.getElementById("detailRecordTableBody");
const detailMemo = document.getElementById("detailMemo");

const attendanceStartDate = document.getElementById("attendanceStartDate");
const attendanceEndDate = document.getElementById("attendanceEndDate");
const attendanceSearchBtn = document.getElementById("attendanceSearchBtn");
const attendanceResetBtn = document.getElementById("attendanceResetBtn");

function getStatusClass(status) {
  if (status === "정상" || status === "활성") return "normal";
  if (status === "지각" || status === "대기") return "late";
  if (status === "위치오류" || status === "비활성") return "location";
  return "absent";
}

function renderNotFound() {
  employeeDetailTitle.textContent = "직원을 찾을 수 없습니다.";

  document.querySelector(".content").innerHTML = `
    <section class="panel">
      <div class="employee-not-found">
        <h3>직원 정보를 찾을 수 없습니다.</h3>
        <p>목록으로 돌아가 다시 선택해 주세요.</p>
        <a href="admin-employees.html">직원 목록으로 이동</a>
      </div>
    </section>
  `;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function setDefaultDateRange() {
  if (!attendanceStartDate || !attendanceEndDate) return;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  attendanceStartDate.value = formatDate(firstDay);
  attendanceEndDate.value = formatDate(lastDay);
}

function filterAttendanceRecords() {
  if (!employee || !employee.recentRecords) return [];

  const startDate = attendanceStartDate ? attendanceStartDate.value : "";
  const endDate = attendanceEndDate ? attendanceEndDate.value : "";

  return employee.recentRecords.filter((record) => {
    if (startDate && record.date < startDate) return false;
    if (endDate && record.date > endDate) return false;
    return true;
  });
}

function renderEmployeeDetail() {
  if (!employee) {
    renderNotFound();
    return;
  }

  employeeDetailTitle.textContent = `${employee.name} 상세`;
  detailAvatar.textContent = employee.name.slice(0, 1);
  detailName.textContent = employee.name;
  detailInfo.textContent = `${employee.team} · ${employee.status}`;

  detailPhone.textContent = employee.phone;
  detailLoginId.textContent = employee.loginId;
  detailJoinDate.textContent = employee.joinDate;
  detailStatus.textContent = employee.status;

  detailWorkDays.textContent = employee.workDays;
  detailLateCount.textContent = employee.lateCount;
  detailAbsentCount.textContent = employee.absentCount;
  detailWorkHours.textContent = employee.workHours;

  detailMemo.textContent = employee.memo || "등록된 메모가 없습니다.";

  detailRegionList.innerHTML = employee.regions
    .map((region) => {
      const emptyClass = region === "미배정" ? "empty" : "";
      return `<span class="employee-region-chip ${emptyClass}">${region}</span>`;
    })
    .join("");

  setDefaultDateRange();
  renderAttendanceRecords();
}

function renderAttendanceRecords() {
  if (!detailRecordTableBody) return;

  const records = filterAttendanceRecords();

  if (!records || records.length === 0) {
    detailRecordTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">선택한 기간의 출근부 기록이 없습니다.</td>
      </tr>
    `;
    return;
  }

  detailRecordTableBody.innerHTML = records
    .map((record) => {
      return `
        <tr>
          <td>${record.displayDate || record.date}</td>
          <td>${record.region}</td>
          <td>${record.checkIn}</td>
          <td>${record.checkOut}</td>
          <td>${record.workTime || "—"}</td>
          <td>
            <span class="status ${getStatusClass(record.status)}">
              ${record.status}
            </span>
          </td>
          <td class="memo-cell">${record.memo}</td>
        </tr>
      `;
    })
    .join("");
}

function resetToThisMonth() {
  setDefaultDateRange();
  renderAttendanceRecords();
}

function initEmployeeDetailPage() {
  renderEmployeeDetail();

  if (attendanceSearchBtn) {
    attendanceSearchBtn.addEventListener("click", renderAttendanceRecords);
  }

  if (attendanceResetBtn) {
    attendanceResetBtn.addEventListener("click", resetToThisMonth);
  }

  if (attendanceStartDate) {
    attendanceStartDate.addEventListener("change", renderAttendanceRecords);
  }

  if (attendanceEndDate) {
    attendanceEndDate.addEventListener("change", renderAttendanceRecords);
  }
}

initEmployeeDetailPage();