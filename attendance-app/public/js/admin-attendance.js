/* =========================================================
   🔥 관리자 출퇴근관리 (Supabase 실시간 DB 연동 완료 버전)
========================================================= */
import supabase from "./supabase.js";

// DOM 요소 연결
const todayDateElement = document.getElementById("todayDate");
const attendanceTableBody = document.getElementById("attendanceTableBody");
const regionFilter = document.getElementById("regionFilter");
const statusFilter = document.getElementById("statusFilter");
const employeeSearchInput = document.getElementById("employeeSearchInput");
const lateList = document.querySelector(".late-list");
const excelDownloadBtn = document.getElementById("excelDownloadBtn");

// 상단 통계 숫자 DOM
const statCheckIn = document.getElementById("statCheckIn");
const statDone = document.getElementById("statDone");
const statWorking = document.getElementById("statWorking");
const statLate = document.getElementById("statLate");
const statAbsent = document.getElementById("statAbsent");
const statLocation = document.getElementById("statLocation");

// 오늘 날짜 문자열 (YYYY-MM-DD)
const todayStr = new Date().toISOString().split("T")[0];

// 실제 DB에서 불러온 데이터를 보관할 배열 (필터링용)
let realAttendanceList = [];

// 1. 상단 안내 날짜 설정
function setTodayDate() {
  if (!todayDateElement) return;
  const today = new Date();
  const formattedDate = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  todayDateElement.textContent = `${formattedDate} 출퇴근 현황과 반복 지각 직원을 실시간으로 확인합니다.`;
}

// 2. 시간 포맷 (예: 09:02)
function formatTime(timeString) {
  if (!timeString) return "—";
  const date = new Date(timeString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

// 3. 총 근무시간 계산
function calcWorkTime(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "근무중";
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";

  const diffMs = end - start;
  if (diffMs <= 0) return "—";

  const totalMinutes = Math.floor(diffMs / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}시간 ${minutes >= 10 ? minutes : "0" + minutes}분`;
}

// 4. 상태별 CSS 클래스 반환
function getStatusClass(statusType) {
  if (statusType === "late" || statusType === "지각") return "late";
  if (statusType === "absent" || statusType === "미출근") return "absent";
  if (statusType === "location_error" || statusType === "위치오류") return "location";
  return "normal";
}

// 5. 🔥 Supabase에서 오늘 출퇴근 데이터 및 전체 직원 조회
async function fetchTodayAttendance() {
  try {
    // ① 전체 활성 직원 목록 조회 (미출근자 계산용)
    const { data: allUsers, error: userError } = await supabase
      .from("users")
      .select("id, name, department")
      .eq("status", "active");

    // ② 오늘 찍힌 출근 기록 (직원정보, 근무지정보 조인)
    const { data: attData, error: attError } = await supabase
      .from("attendance")
      .select(`
        id, user_id, check_in_time, check_out_time, status,
        users ( name, department ),
        workplaces ( name )
      `)
      .eq("work_date", todayStr);

    if (userError || attError) {
      console.error("데이터 불러오기 실패:", userError || attError);
      return [];
    }

    // ③ 출근한 직원들의 ID 목록
    const checkedInUserIds = new Set((attData || []).map((item) => item.user_id));

    // ④ 실제 출근 기록 변환
    const formattedAtt = (attData || []).map((item) => {
      let statusText = "근무중";
      let statusType = "normal";

      if (item.status === "late" || item.status === "지각") {
        statusText = "지각";
        statusType = "late";
      } else if (item.status === "location_error" || item.status === "위치오류") {
        statusText = "위치오류";
        statusType = "location";
      } else if (item.check_out_time) {
        statusText = "퇴근완료";
        statusType = "normal";
      }

      return {
        id: item.id,
        user_id: item.user_id,
        name: item.users?.name || "이름 없음",
        department: item.users?.department || "부서 없음",
        region: item.workplaces?.name || "미배정",
        checkIn: formatTime(item.check_in_time),
        checkOut: formatTime(item.check_out_time),
        workTime: calcWorkTime(item.check_in_time, item.check_out_time),
        status: statusText,
        statusType: statusType,
        rawCheckIn: item.check_in_time,
        rawCheckOut: item.check_out_time
      };
    });

    // ⑤ 아직 출근 안 한 직원들(미출근)을 리스트에 추가
    const absentUsers = (allUsers || [])
      .filter((u) => !checkedInUserIds.has(u.id))
      .map((u) => ({
        id: `absent-${u.id}`,
        user_id: u.id,
        name: u.name || "이름 없음",
        department: u.department || "부서 없음",
        region: "미출근",
        checkIn: "—",
        checkOut: "—",
        workTime: "—",
        status: "미출근",
        statusType: "absent",
        rawCheckIn: null,
        rawCheckOut: null
      }));

    // 출근자 + 미출근자 합쳐서 반환
    return [...formattedAtt, ...absentUsers];
  } catch (err) {
    console.error("출퇴근 조회 에러:", err);
    return [];
  }
}

// 6. 🔥 상단 통계 숫자 실시간 계산 및 반영
function updateSummaryStats(data) {
  let totalCheckIn = 0;
  let totalDone = 0;
  let totalWorking = 0;
  let totalLate = 0;
  let totalAbsent = 0;
  let totalLocation = 0;

  data.forEach((item) => {
    if (item.statusType === "absent") {
      totalAbsent++;
    } else {
      totalCheckIn++; // 출근 기록이 있으면 무조건 출근완료 카운트 증가
      if (item.rawCheckOut) totalDone++;
      else totalWorking++;

      if (item.statusType === "late") totalLate++;
      if (item.statusType === "location") totalLocation++;
    }
  });

  if (statCheckIn) statCheckIn.textContent = totalCheckIn;
  if (statDone) statDone.textContent = totalDone;
  if (statWorking) statWorking.textContent = totalWorking;
  if (statLate) statLate.textContent = totalLate;
  if (statAbsent) statAbsent.textContent = totalAbsent;
  if (statLocation) statLocation.textContent = totalLocation;
}

// 7. 출퇴근 테이블 화면 렌더링
function renderAttendanceTable(data) {
  if (!attendanceTableBody) return;

  if (!data || data.length === 0) {
    attendanceTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row" style="text-align:center; padding:30px; color:#888;">
          조회된 출퇴근 기록이 없습니다.
        </tr>
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
              <div>
                <strong>${item.name}</strong>
                <span style="display:block; font-size:11px; color:#888;">${item.department}</span>
              </div>
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
            <a href="admin-employee-detail.html?id=${item.user_id}" class="table-action-btn" style="text-decoration:none; display:inline-block; text-align:center;">
              상세
            </a>
          </td>
        </tr>
      `;
    })
    .join("");
}

// 8. 🔥 이번 달 지각 3회 이상 상습 지각자 실시간 조회
async function loadMonthlyLateEmployees() {
  if (!lateList) return;

  try {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];

    // 이번 달 1일부터 오늘까지의 지각 기록 모두 조회
    const { data: lateData, error } = await supabase
      .from("attendance")
      .select(`
        user_id,
        users ( name, department ),
        workplaces ( name )
      `)
      .gte("work_date", firstDayOfMonth)
      .in("status", ["late", "지각"]);

    if (error || !lateData || lateData.length === 0) {
      lateList.innerHTML = `<p style="padding:16px; color:#888; text-align:center;">이번 달 지각자가 없습니다.</p>`;
      return;
    }

    // 직원별 지각 횟수 집계 (Map 활용)
    const countMap = new Map();
    lateData.forEach((item) => {
      const uid = item.user_id;
      if (!countMap.has(uid)) {
        countMap.set(uid, {
          name: item.users?.name || "직원",
          info: `${item.users?.department || '부서없음'} · ${item.workplaces?.name || '미배정'}`,
          count: 0
        });
      }
      countMap.get(uid).count++;
    });

    // 지각 3회 이상인 직원만 필터링 후 횟수 많은 순 정렬
    const chronicLates = Array.from(countMap.values())
      .filter((emp) => emp.count >= 3)
      .sort((a, b) => b.count - a.count);

    if (chronicLates.length === 0) {
      lateList.innerHTML = `<p style="padding:16px; color:#888; text-align:center;">지각 3회 이상 직원이 없습니다.</p>`;
      return;
    }

    lateList.innerHTML = chronicLates
      .map((emp) => `
        <div class="late-item">
          <div>
            <strong>${emp.name}</strong>
            <p>${emp.info}</p>
          </div>
          <span style="background:#fee2e2; color:#dc2626; font-weight:bold; padding:4px 8px; border-radius:8px;">
            ${emp.count}회
          </span>
        </div>
      `)
      .join("");
  } catch (err) {
    console.error("지각자 조회 에러:", err);
    lateList.innerHTML = `<p style="padding:10px; color:#888;">지각 정보를 불러오지 못했습니다.</p>`;
  }
}

// 9. 지역, 상태, 이름 검색 필터링 기능
function filterAttendanceData() {
// ... 필터링 로직 ...
  const filteredData = realAttendanceList.filter(...);
  
  // 🔥 핵심: 필터링된 결과에 맞춰 상단 박스 숫자도 다시 갱신해야 합니다!
  updateSummaryStats(filteredData); 
  
  renderAttendanceTable(filteredData);

  const selectedRegion = regionFilter ? regionFilter.value : "전체 지역";
  const selectedStatus = statusFilter ? statusFilter.value : "전체 상태";
  const searchKeyword = employeeSearchInput ? employeeSearchInput.value.trim() : "";

  const filteredData = realAttendanceList.filter((item) => {
    const isRegionMatched =
      selectedRegion === "전체 지역" || item.region === selectedRegion;

    const isStatusMatched =
      selectedStatus === "전체 상태" || item.status === selectedStatus;

    const isSearchMatched =
      searchKeyword === "" || item.name.includes(searchKeyword);

    return isRegionMatched && isStatusMatched && isSearchMatched;
  });

  updateSummaryStats(filteredData); 
  renderAttendanceTable(filteredData);
}

// 10. 엑셀 다운로드 (우선 안내 메시지 처리)
function handleExcelDownload() {
  alert("⬇️ 현재 조회된 데이터를 엑셀로 내보냅니다. (SheetJS 라이브러리 추가 시 즉시 다운로드 가능)");
}

// 🔥 페이지 초기화 실행
async function initAttendancePage() {
  setTodayDate();

  // 1. 실제 DB에서 오늘 출퇴근 목록 가져오기
  realAttendanceList = await fetchTodayAttendance();

  // 2. 상단 통계 숫자 계산 및 반영
  updateSummaryStats(realAttendanceList);

  // 3. 표(Table) 렌더링
  renderAttendanceTable(realAttendanceList);

  // 4. 이번 달 상습 지각자 조회
  await loadMonthlyLateEmployees();

  // 5. 필터 및 검색 이벤트 리스너 연결
  if (regionFilter) regionFilter.addEventListener("change", filterAttendanceData);
  if (statusFilter) statusFilter.addEventListener("change", filterAttendanceData);
  if (employeeSearchInput) employeeSearchInput.addEventListener("input", filterAttendanceData);
  if (excelDownloadBtn) excelDownloadBtn.addEventListener("click", handleExcelDownload);
}

initAttendancePage();