/* =========================================================
  관리자 월간 출근부
  Supabase 실데이터 연동
========================================================= */

import supabase from "./supabase.js";

/* =========================
  DOM
========================= */

const monthFilter = document.getElementById("monthFilter");
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

const employeeDetailEmpty = document.getElementById(
  "employeeDetailEmpty"
);

const employeeDetailContent = document.getElementById(
  "employeeDetailContent"
);

const detailAvatar = document.getElementById("detailAvatar");
const detailName = document.getElementById("detailName");
const detailInfo = document.getElementById("detailInfo");

const detailWorkDays = document.getElementById("detailWorkDays");
const detailLateCount = document.getElementById("detailLateCount");
const detailAbsentCount = document.getElementById("detailAbsentCount");
const detailWorkHours = document.getElementById("detailWorkHours");

const recentMemoList = document.getElementById("recentMemoList");
const monthlyDownloadBtn = document.getElementById(
  "monthlyDownloadBtn"
);

/* =========================
  상태값
========================= */

let employeeList = [];
let monthlyRecords = [];
let filteredRecords = [];

/* =========================
  현재 월
========================= */

function getCurrentMonth() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

/* =========================
  월 시작일 / 다음 달 시작일
========================= */

function getMonthRange(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;

  const nextMonthDate = new Date(year, month, 1);

  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = String(
    nextMonthDate.getMonth() + 1
  ).padStart(2, "0");

  const endDate = `${nextYear}-${nextMonth}-01`;

  return {
    startDate,
    endDate,
  };
}

/* =========================
  HTML 보안 처리
========================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
  날짜 표시
========================= */

function formatDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
}

/* =========================
  시간 표시
========================= */

function formatTime(dateTimeString) {
  if (!dateTimeString) return "—";

  const date = new Date(dateTimeString);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/* =========================
  근무시간 계산
========================= */

function calculateWorkMinutes(checkIn, checkOut) {
  if (!checkIn || !checkOut) {
    return 0;
  }

  const start = new Date(checkIn);
  const end = new Date(checkOut);

  const difference = Math.floor(
    (end.getTime() - start.getTime()) / 60000
  );

  if (!Number.isFinite(difference) || difference <= 0) {
    return 0;
  }

  return difference;
}

/* =========================
  분 → 시간 문자열
========================= */

function formatWorkMinutes(totalMinutes) {
  if (!totalMinutes) {
    return "—";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}시간 ${String(minutes).padStart(2, "0")}분`;
}

/* =========================
  30분 단위 반올림
========================= */

function formatRoundedWorkTime(totalMinutes) {
  const roundedMinutes = Math.round(totalMinutes / 30) * 30;

  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  if (minutes === 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${minutes}분`;
}

/* =========================
  상태 변환
========================= */

function normalizeStatus(status, checkIn, checkOut) {
  const value = String(status || "").toLowerCase();

  if (value === "late" || value === "지각") {
    return {
      text: "지각",
      type: "late",
    };
  }

  if (
    value === "absent" ||
    value === "미출근" ||
    value === "no_show"
  ) {
    return {
      text: "미출근",
      type: "absent",
    };
  }

  if (
    value === "location_error" ||
    value === "location" ||
    value === "위치오류"
  ) {
    return {
      text: "위치오류",
      type: "location",
    };
  }

  if (value === "leave" || value === "휴가") {
    return {
      text: "휴가",
      type: "normal",
    };
  }

  if (checkOut) {
    return {
      text: "퇴근완료",
      type: "normal",
    };
  }

  if (checkIn) {
    return {
      text: "근무중",
      type: "normal",
    };
  }

  return {
    text: "미출근",
    type: "absent",
  };
}

/* =========================
  상태 CSS 클래스
========================= */

function getStatusClass(statusType) {
  if (statusType === "late") {
    return "late";
  }

  if (statusType === "absent") {
    return "absent";
  }

  if (statusType === "location") {
    return "location";
  }

  if (statusType === "annual_leave") {
    return "annual-leave";
  }

  return "normal";
}

/* =========================
  메모 가져오기

  현재 attendance 테이블에
  memo 컬럼이 없을 수 있으므로
  존재 가능한 이름을 순서대로 확인
========================= */

function getRecordMemo(record) {
  return (
    record.memo ||
    record.note ||
    record.admin_memo ||
    record.reason ||
    record.absence_reason ||
    "-"
  );
}

/* =========================
  직원 목록 조회
========================= */

async function fetchEmployees() {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, department, status")
    .eq("status", "active")
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  employeeList = data || [];
}

/* =========================
  직원 선택창 출력
========================= */

function renderEmployeeOptions() {
  if (!employeeFilter) {
    return;
  }

  employeeFilter.innerHTML = `
    <option value="all">전체 직원</option>

    ${employeeList
      .map(
        (employee) => `
          <option value="${escapeHtml(employee.id)}">
            ${escapeHtml(employee.name)}
          </option>
        `
      )
      .join("")}
  `;
}

/* =========================
  월간 출근 기록 조회
========================= */

async function fetchMonthlyAttendance() {
  const selectedMonth =
    monthFilter?.value ||
    getCurrentMonth();

  const {
    startDate,
    endDate,
  } = getMonthRange(selectedMonth);

  const [
    attendanceResult,
    leaveResult,
  ] = await Promise.all([
    supabase
      .from("attendance")
      .select(`
        id,
        user_id,
        work_date,
        check_in_time,
        check_out_time,
        status,
        users (
          id,
          name,
          department
        ),
        workplaces (
          id,
          name
        )
      `)
      .gte("work_date", startDate)
      .lt("work_date", endDate)
      .order("work_date", {
        ascending: false,
      })
      .order("check_in_time", {
        ascending: true,
      }),

    supabase
      .from("employee_daily_notes")
      .select(`
        id,
        user_id,
        note_date,
        content,
        day_type,
        users (
          id,
          name,
          department
        )
      `)
      .eq("day_type", "annual_leave")
      .gte("note_date", startDate)
      .lt("note_date", endDate)
      .order("note_date", {
        ascending: false,
      }),
  ]);

  if (attendanceResult.error) {
    throw attendanceResult.error;
  }

  if (leaveResult.error) {
    throw leaveResult.error;
  }

  const regionByUser = new Map();

  const attendanceRecords =
    (attendanceResult.data || []).map(
      (record) => {
        const status =
          normalizeStatus(
            record.status,
            record.check_in_time,
            record.check_out_time
          );

        const workMinutes =
          calculateWorkMinutes(
            record.check_in_time,
            record.check_out_time
          );

        const region =
          record.workplaces?.name ||
          "미배정";

        if (
          region !== "미배정" &&
          !regionByUser.has(
            String(record.user_id)
          )
        ) {
          regionByUser.set(
            String(record.user_id),
            region
          );
        }

        return {
          id: record.id,
          userId: record.user_id,

          date: record.work_date,
          displayDate:
            formatDate(record.work_date),

          name:
            record.users?.name ||
            "이름 없음",

          department:
            record.users?.department ||
            "부서 없음",

          region,

          checkIn:
            formatTime(
              record.check_in_time
            ),

          checkOut:
            formatTime(
              record.check_out_time
            ),

          rawCheckIn:
            record.check_in_time,

          rawCheckOut:
            record.check_out_time,

          workMinutes,

          workTimeText:
            formatWorkMinutes(
              workMinutes
            ),

          status: status.text,
          statusType: status.type,

          memo:
            getRecordMemo(record),

          isAnnualLeave: false,
        };
      }
    );

  const recordMap = new Map();

  attendanceRecords.forEach(
    (record) => {
      const key =
        `${record.userId}_${record.date}`;

      recordMap.set(key, record);
    }
  );

  (leaveResult.data || []).forEach(
    (leave) => {
      const key =
        `${leave.user_id}_${leave.note_date}`;

      const existingRecord =
        recordMap.get(key);

      const employee =
        employeeList.find(
          (item) =>
            String(item.id) ===
            String(leave.user_id)
        );

      recordMap.set(key, {
        id:
          `leave-${leave.user_id}-${leave.note_date}`,

        userId:
          leave.user_id,

        date:
          leave.note_date,

        displayDate:
          formatDate(
            leave.note_date
          ),

        name:
          leave.users?.name ||
          employee?.name ||
          "이름 없음",

        department:
          leave.users?.department ||
          employee?.department ||
          "부서 없음",

        region:
          existingRecord?.region ||
          regionByUser.get(
            String(leave.user_id)
          ) ||
          "미배정",

        checkIn: "—",
        checkOut: "—",

        rawCheckIn: null,
        rawCheckOut: null,

        workMinutes: 0,
        workTimeText: "—",

        status: "연차",
        statusType: "annual_leave",

        memo:
          leave.content || "-",

        isAnnualLeave: true,
      });
    }
  );

  monthlyRecords =
    Array.from(
      recordMap.values()
    ).sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(
          a.date
        );
      }

      return a.name.localeCompare(
        b.name,
        "ko"
      );
    });
}

/* =========================
  지역 선택창 만들기

  월간 기록에 실제 존재하는
  근무지역만 자동으로 표시
========================= */

function renderRegionOptions() {
  if (!regionFilter) {
    return;
  }

  const currentValue = regionFilter.value;

  const regionNames = [
    ...new Set(
      monthlyRecords
        .map((record) => record.region)
        .filter(
          (region) =>
            region &&
            region !== "미배정"
        )
    ),
  ].sort();

  regionFilter.innerHTML = `
    <option value="all">전체 지역</option>

    ${regionNames
      .map(
        (region) => `
          <option value="${escapeHtml(region)}">
            ${escapeHtml(region)}
          </option>
        `
      )
      .join("")}
  `;

  const optionExists = [
    ...regionFilter.options,
  ].some(
    (option) => option.value === currentValue
  );

  if (optionExists) {
    regionFilter.value = currentValue;
  }
}

/* =========================
  표 출력
========================= */

function renderMonthlyTable(records) {
  if (!monthlyTableBody) {
    return;
  }

  if (!records.length) {
    monthlyTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-table-cell">
          선택한 조건에 해당하는 출근 기록이 없습니다.
        </td>
      </tr>
    `;

    return;
  }

  monthlyTableBody.innerHTML = records
    .map((record) => {
      const firstName =
        record.name?.slice(0, 1) || "?";

      return `
        <tr>
          <td>
            ${escapeHtml(record.displayDate)}
          </td>

          <td>
            <div class="employee-cell">
              <span class="avatar">
                ${escapeHtml(firstName)}
              </span>

              <div>
                <strong>
                  ${escapeHtml(record.name)}
                </strong>

                <p>
                  ${escapeHtml(record.department)}
                </p>
              </div>
            </div>
          </td>

          <td>
            ${escapeHtml(record.region)}
          </td>

          <td>
            ${escapeHtml(record.checkIn)}
          </td>

          <td>
            ${escapeHtml(record.checkOut)}
          </td>

          <td>
            ${escapeHtml(record.workTimeText)}
          </td>

          <td>
            <span class="status-badge ${getStatusClass(
              record.statusType
            )}">
              ${escapeHtml(record.status)}
            </span>
          </td>

          <td title="${escapeHtml(record.memo)}">
            ${escapeHtml(record.memo)}
          </td>
        </tr>
      `;
    })
    .join("");
}

/* =========================
  평균 출근시간
========================= */

function calculateAverageCheckIn(records) {
  const checkInMinutes = records
    .filter((record) => record.rawCheckIn)
    .map((record) => {
      const date = new Date(record.rawCheckIn);

      return (
        date.getHours() * 60 +
        date.getMinutes()
      );
    })
    .filter(Number.isFinite);

  if (!checkInMinutes.length) {
    return "-";
  }

  const total = checkInMinutes.reduce(
    (sum, minutes) => sum + minutes,
    0
  );

  const average = Math.round(
    total / checkInMinutes.length
  );

  const hour = Math.floor(average / 60);
  const minute = average % 60;

  return `${String(hour).padStart(
    2,
    "0"
  )}:${String(minute).padStart(2, "0")}`;
}

/* =========================
  상단 요약
========================= */

function updateSummary(records) {
  const workDays = records.filter(
    (record) => record.rawCheckIn
  ).length;

  const lateCount = records.filter(
    (record) => record.statusType === "late"
  ).length;

  const absentCount = records.filter(
    (record) => record.statusType === "absent"
  ).length;

  const totalWorkMinutes = records.reduce(
    (total, record) =>
      total + record.workMinutes,
    0
  );

  if (summaryWorkDays) {
    summaryWorkDays.textContent = workDays;
  }

  if (summaryLateCount) {
    summaryLateCount.textContent = lateCount;
  }

  if (summaryAbsentCount) {
    summaryAbsentCount.textContent =
      absentCount;
  }

  if (summaryWorkHours) {
    summaryWorkHours.textContent =
      formatRoundedWorkTime(totalWorkMinutes);
  }

  if (summaryAverageTime) {
    summaryAverageTime.textContent =
      calculateAverageCheckIn(records);
  }
}

/* =========================
  직원 상세 요약
========================= */

function updateEmployeeDetail() {
  const selectedEmployeeId =
    employeeFilter?.value || "all";

  if (selectedEmployeeId === "all") {
    if (employeeDetailEmpty) {
      employeeDetailEmpty.style.display =
        "block";
    }

    if (employeeDetailContent) {
      employeeDetailContent.classList.remove(
        "active"
      );
    }

    if (monthlyTableTitle) {
      monthlyTableTitle.textContent =
        "전체 직원 월간 출근 기록";
    }

    return;
  }

  const employee = employeeList.find(
    (item) =>
      String(item.id) ===
      String(selectedEmployeeId)
  );

  if (!employee) {
    return;
  }

  const employeeRecords =
    monthlyRecords.filter(
      (record) =>
        String(record.userId) ===
        String(selectedEmployeeId)
    );

  const workDays = employeeRecords.filter(
    (record) => record.rawCheckIn
  ).length;

  const lateCount = employeeRecords.filter(
    (record) =>
      record.statusType === "late"
  ).length;

  const absentCount =
    employeeRecords.filter(
      (record) =>
        record.statusType === "absent"
    ).length;

  const totalMinutes =
    employeeRecords.reduce(
      (sum, record) =>
        sum + record.workMinutes,
      0
    );

  const regions = [
    ...new Set(
      employeeRecords
        .map((record) => record.region)
        .filter(Boolean)
    ),
  ];

  if (employeeDetailEmpty) {
    employeeDetailEmpty.style.display =
      "none";
  }

  if (employeeDetailContent) {
    employeeDetailContent.classList.add(
      "active"
    );
  }

  if (monthlyTableTitle) {
    monthlyTableTitle.textContent =
      `${employee.name} 월간 출근 기록`;
  }

  if (detailAvatar) {
    detailAvatar.textContent =
      employee.name?.slice(0, 1) || "?";
  }

  if (detailName) {
    detailName.textContent =
      employee.name || "이름 없음";
  }

  if (detailInfo) {
    detailInfo.textContent =
      `${
        regions.join(", ") || "미배정"
      } · ${
        employee.department || "부서 없음"
      }`;
  }

  if (detailWorkDays) {
    detailWorkDays.textContent =
      `${workDays}일`;
  }

  if (detailLateCount) {
    detailLateCount.textContent =
      `${lateCount}회`;
  }

  if (detailAbsentCount) {
    detailAbsentCount.textContent =
      `${absentCount}회`;
  }

  if (detailWorkHours) {
    detailWorkHours.textContent =
      formatRoundedWorkTime(totalMinutes);
  }

  renderRecentMemos(employeeRecords);
}

/* =========================
  최근 메모
========================= */

function renderRecentMemos(records) {
  if (!recentMemoList) {
    return;
  }

  const memoRecords = records
    .filter(
      (record) =>
        record.memo &&
        record.memo !== "-"
    )
    .slice(0, 5);

  if (!memoRecords.length) {
    recentMemoList.innerHTML = `
      <li>등록된 메모가 없습니다.</li>
    `;

    return;
  }

  recentMemoList.innerHTML = memoRecords
    .map(
      (record) => `
        <li>
          <strong>
            ${escapeHtml(record.displayDate)}
          </strong>
          ·
          ${escapeHtml(record.memo)}
        </li>
      `
    )
    .join("");
}

/* =========================
  필터
========================= */

function filterMonthlyRecords() {
  const selectedEmployee =
    employeeFilter?.value || "all";

  const selectedRegion =
    regionFilter?.value || "all";

  const keyword =
    monthlySearchInput?.value
      .trim()
      .toLowerCase() || "";

  filteredRecords = monthlyRecords.filter(
    (record) => {
      const employeeMatched =
        selectedEmployee === "all" ||
        String(record.userId) ===
          String(selectedEmployee);

      const regionMatched =
        selectedRegion === "all" ||
        record.region === selectedRegion;

      const keywordMatched =
        keyword === "" ||
        record.name
          .toLowerCase()
          .includes(keyword) ||
        record.department
          .toLowerCase()
          .includes(keyword);

      return (
        employeeMatched &&
        regionMatched &&
        keywordMatched
      );
    }
  );

  renderMonthlyTable(filteredRecords);
  updateSummary(filteredRecords);
  updateEmployeeDetail();
}

/* =========================
  엑셀 다운로드
========================= */

function downloadMonthlyExcel() {
  if (!filteredRecords.length) {
    alert(
      "다운로드할 월간 출근 기록이 없습니다."
    );

    return;
  }

  if (typeof XLSX === "undefined") {
    alert(
      "엑셀 라이브러리를 불러오지 못했습니다."
    );

    return;
  }

  const excelData = filteredRecords.map(
    (record, index) => ({
      No: index + 1,
      날짜: record.date,
      직원명: record.name,
      부서: record.department,
      배정지역: record.region,
      출근시간: record.checkIn,
      퇴근시간: record.checkOut,
      근무시간: record.workTimeText,
      상태: record.status,
      메모: record.memo,
    })
  );

  const worksheet =
    XLSX.utils.json_to_sheet(excelData);

  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 12 },
    { wch: 30 },
  ];

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "월간출근부"
  );

  const selectedMonth =
    monthFilter?.value || getCurrentMonth();

  XLSX.writeFile(
    workbook,
    `월간출근부_${selectedMonth}.xlsx`
  );
}

/* =========================
  로딩 표시
========================= */

function showLoading() {
  if (!monthlyTableBody) {
    return;
  }

  monthlyTableBody.innerHTML = `
    <tr>
      <td colspan="8" class="empty-table-cell">
        월간 출근 기록을 불러오는 중입니다.
      </td>
    </tr>
  `;
}

/* =========================
  월간 기록 다시 불러오기
========================= */

async function loadMonthlyAttendance() {
  showLoading();

  try {
    await fetchMonthlyAttendance();

    renderRegionOptions();
    filterMonthlyRecords();
  } catch (error) {
    console.error(
      "월간 출근부 조회 실패:",
      error
    );

    monthlyRecords = [];
    filteredRecords = [];

    if (monthlyTableBody) {
      monthlyTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-table-cell">
            월간 출근 기록을 불러오지 못했습니다.
            <br>
            브라우저 콘솔에서 Supabase 오류를 확인해 주세요.
          </td>
        </tr>
      `;
    }

    updateSummary([]);
    updateEmployeeDetail();
  }
}

/* =========================
  초기 실행
========================= */

async function initMonthlyAttendancePage() {
  if (monthFilter) {
    monthFilter.value = getCurrentMonth();
  }

  try {
    await fetchEmployees();

    renderEmployeeOptions();
    await loadMonthlyAttendance();
  } catch (error) {
    console.error(
      "월간 출근부 초기화 실패:",
      error
    );

    if (monthlyTableBody) {
      monthlyTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-table-cell">
            직원 또는 출근 정보를 불러오지 못했습니다.
          </td>
        </tr>
      `;
    }
  }

  monthFilter?.addEventListener(
    "change",
    loadMonthlyAttendance
  );

  employeeFilter?.addEventListener(
    "change",
    filterMonthlyRecords
  );

  regionFilter?.addEventListener(
    "change",
    filterMonthlyRecords
  );

  monthlySearchInput?.addEventListener(
    "input",
    filterMonthlyRecords
  );

  monthlyDownloadBtn?.addEventListener(
    "click",
    downloadMonthlyExcel
  );
}

initMonthlyAttendancePage();