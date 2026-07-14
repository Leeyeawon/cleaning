import supabase from "./supabase.js";
import {
  getEmployeeSessionToken,
  getCurrentEmployee,
} from "./employeeAuth.js";

const todayDate = document.getElementById("todayDate");
const userName = document.getElementById("userName");

const attendanceBtn = document.getElementById("attendanceBtn");
const buttonText = document.getElementById("buttonText");
const workStatus = document.getElementById("workStatus");
const checkInTime = document.getElementById("checkInTime");
const checkOutTime = document.getElementById("checkOutTime");

const homeNoticeList = document.getElementById("homeNoticeList");
const noticeMoreBtn = document.getElementById("noticeMoreBtn");

let currentEmployee = null;
let todayAttendance = null;

// 상단에 오늘 날짜 표시
function setTodayDate() {
  if (!todayDate) return;

  const today = new Date();
  const formatted = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  todayDate.textContent = formatted;
}

// 시간 포맷 (예: 09:02)
function formatTime(dateString) {
  if (!dateString) return "--:--";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 브라우저/스마트폰 GPS 위치 가져오기
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 브라우저에서는 위치 정보를 사용할 수 없습니다."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

// 화면 UI 상태 업데이트 (출근 전 / 근무 중 / 근무 완료)
function updateAttendanceUI() {
  if (!workStatus || !buttonText || !checkInTime || !checkOutTime) return;

  if (!todayAttendance) {
    workStatus.textContent = "출근 전";
    buttonText.textContent = "출근하기";
    checkInTime.textContent = "--:--";
    checkOutTime.textContent = "--:--";

    if (attendanceBtn) attendanceBtn.disabled = false;
    return;
  }

  checkInTime.textContent = formatTime(todayAttendance.check_in_time);
  checkOutTime.textContent = formatTime(todayAttendance.check_out_time);

  if (todayAttendance.check_in_time && !todayAttendance.check_out_time) {
    workStatus.textContent = "근무 중";
    buttonText.textContent = "퇴근하기";

    if (attendanceBtn) attendanceBtn.disabled = false;
    return;
  }

  if (todayAttendance.check_in_time && todayAttendance.check_out_time) {
    workStatus.textContent = "근무 완료";
    buttonText.textContent = "퇴근 완료";

    if (attendanceBtn) attendanceBtn.disabled = true;
  }
}

// 에러 메시지 한글화
function getErrorMessage(error) {
  const message = error?.message || "";

  if (message.includes("INVALID_SESSION")) {
    return "로그인 정보가 만료되었습니다. 다시 로그인해주세요.";
  }
  if (message.includes("ALREADY_CHECKED_IN")) {
    return "이미 오늘 출근 처리되었습니다.";
  }
  if (message.includes("OUT_OF_WORKPLACE_RANGE")) {
    return "현재 위치가 배정된 근무지 범위 밖입니다.";
  }
  if (message.includes("NO_WORKING_ATTENDANCE")) {
    return "퇴근 처리할 출근 기록이 없습니다.";
  }

  return "처리 중 오류가 발생했습니다.";
}

// 오늘 출퇴근 기록 조회
async function loadTodayAttendance() {
  const token = getEmployeeSessionToken();
  if (!token) {
    location.href = "../employee/login.html";
    return;
  }

  const { data, error } = await supabase.rpc("get_my_today_attendance", {
    p_session_token: token,
  });

  if (error) {
    console.error("오늘 출근 기록 조회 오류:", error);
    alert("오늘 근무 정보를 불러오지 못했습니다.");
    return;
  }

  todayAttendance = data?.[0] || null;
  updateAttendanceUI();
}

// 출근 처리 함수
async function checkIn() {
  const token = getEmployeeSessionToken();
  if (!token) {
    location.href = "../employee/login.html";
    return;
  }

  const position = await getCurrentPosition();

  const { data, error } = await supabase.rpc("employee_check_in", {
    p_session_token: token,
    p_lat: position.latitude,
    p_lng: position.longitude,
  });

  if (error) {
    console.error("출근 오류:", error);
    throw new Error(getErrorMessage(error));
  }

  todayAttendance = data?.[0] || null;
  updateAttendanceUI();

  const workplaceName = todayAttendance?.workplace_name || "근무지";
  alert(`${workplaceName} 출근 완료`);
}

// 퇴근 처리 함수
async function checkOut() {
  const token = getEmployeeSessionToken();
  if (!token) {
    location.href = "../employee/login.html";
    return;
  }

  const position = await getCurrentPosition();

  const { data, error } = await supabase.rpc("employee_check_out", {
    p_session_token: token,
    p_lat: position.latitude,
    p_lng: position.longitude,
  });

  if (error) {
    console.error("퇴근 오류:", error);
    throw new Error(getErrorMessage(error));
  }

  todayAttendance = data?.[0] || null;
  updateAttendanceUI();

  const workplaceName = todayAttendance?.workplace_name || "근무지";
  alert(`${workplaceName} 퇴근 완료`);
}

// 🔥 핵심: 출퇴근 버튼 클릭 이벤트 (확인창 팝업 기능 추가!)
attendanceBtn?.addEventListener("click", async () => {
  try {
    // 1. 출근 전 상태일 때 -> 출근 확인창 띄우기
    if (!todayAttendance) {
      if (!confirm("출근하시겠습니까?")) {
        return; // '아니오/취소'를 누르면 여기서 바로 멈춤!
      }
    }
    // 2. 근무 중(출근 완료, 퇴근 전) 상태일 때 -> 퇴근 확인창 띄우기
    else if (todayAttendance.check_in_time && !todayAttendance.check_out_time) {
      if (!confirm("퇴근하시겠습니까?")) {
        return; // '아니오/취소'를 누르면 여기서 바로 멈춤!
      }
    }
    // 3. 이미 퇴근까지 모두 완료된 상태면 아무 작업도 하지 않음
    else {
      return;
    }

    // --- 확인(예)을 눌렀을 때만 아래 GPS 위치 확인 및 서버 통신 실행 ---
    attendanceBtn.disabled = true;

    if (buttonText) {
      buttonText.textContent = "위치 확인 중...";
    }

    if (!todayAttendance) {
      await checkIn();
      return;
    }

    if (todayAttendance.check_in_time && !todayAttendance.check_out_time) {
      await checkOut();
      return;
    }
  } catch (error) {
    alert(error.message);
    console.error("출퇴근 처리 에러:", error);
  } finally {
    updateAttendanceUI();

    if (!todayAttendance?.check_out_time && attendanceBtn) {
      attendanceBtn.disabled = false;
    }
  }
});

async function loadHomeNoticeFeed() {
  const token = getEmployeeSessionToken();

  if (!token || !homeNoticeList) {
    return;
  }

  const [
    notificationResult,
    workplaceResult,
    noticeResult,
  ] = await Promise.all([
    supabase.rpc(
      "get_my_notifications",
      {
        p_session_token: token,
      }
    ),

    supabase.rpc(
      "get_my_workplaces",
      {
        p_session_token: token,
      }
    ),

    supabase
      .from("notices")
      .select(
        "id, title, content, target, important, created_at"
      )
      .eq("status", "게시중")
      .order("important", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      })
      .limit(30),
  ]);

  if (notificationResult.error) {
    console.error(
      "개인 알림 조회 실패:",
      notificationResult.error
    );
  }

  if (noticeResult.error) {
    console.error(
      "공지사항 조회 실패:",
      noticeResult.error
    );
  }

  const targets = new Set([
    "전체 직원",
    currentEmployee?.department,
    ...(workplaceResult.data || []).map(
      (workplace) =>
        workplace.workplace_name
    ),
  ].filter(Boolean));

  const personalNotifications =
    (notificationResult.data || []).map(
      (notification) => ({
        id: notification.id,
        source: "notification",
        title: notification.title,
        content: notification.content,
        createdAt: notification.created_at,
        unread: !notification.read_at,
        important: true,
        type: notification.type,
      })
    );

  const publicNotices =
    (noticeResult.data || [])
      .filter((notice) =>
        targets.has(notice.target)
      )
      .map((notice) => ({
        id: notice.id,
        source: "notice",
        title: notice.title,
        content: notice.content,
        createdAt: notice.created_at,
        unread: false,
        important: notice.important,
        type: "notice",
      }));

  const feed = [
    ...personalNotifications,
    ...publicNotices,
  ].sort(
    (a, b) =>
      new Date(b.createdAt) -
      new Date(a.createdAt)
  );

  const latest = feed[0];

  if (!latest) {
    homeNoticeList.innerHTML = `
      <article class="notice-item">
        <div class="notice-icon">🔔</div>

        <div>
          <p class="notice-text">
            새로운 공지사항이 없습니다.
          </p>
        </div>
      </article>
    `;

    return;
  }

  const isLeaveNotification =
    latest.type === "annual_leave";

  homeNoticeList.innerHTML = `
    <button
      class="notice-item ${
        latest.unread ? "unread" : ""
      }"
      type="button"
    >
      <div class="notice-icon">
        ${
          isLeaveNotification
            ? "🌴"
            : latest.important
              ? "!"
              : "🔔"
        }
      </div>

      <div class="home-notice-content">
        <span class="home-notice-kind">
          ${
            latest.source === "notification"
              ? isLeaveNotification
                ? "연차 알림"
                : "개인 알림"
              : "공지"
          }
        </span>

        <p class="notice-text"></p>

        <span class="notice-date">
          ${new Date(
            latest.createdAt
          ).toLocaleDateString("ko-KR")}
        </span>
      </div>
    </button>
  `;

  const noticeButton =
    homeNoticeList.querySelector(
      ".notice-item"
    );

  noticeButton
    .querySelector(".notice-text")
    .textContent = latest.title;

  noticeButton.addEventListener(
    "click",
    async () => {
      if (
        latest.source === "notification" &&
        latest.unread
      ) {
        await supabase.rpc(
          "mark_my_notification_read",
          {
            p_session_token: token,
            p_notification_id: latest.id,
          }
        );
      }

      if (
        latest.source === "notification"
      ) {
        location.href =
          `notices.html?notification=${latest.id}`;
      } else {
        location.href =
          `notices.html?notice=${latest.id}`;
      }
    }
  );
}

// 🔥 핵심: 메인 홈 화면 전용 올바른 초기화 함수
async function init() {
  // 1. 로그인된 직원 세션 검증 및 정보 가져오기
  currentEmployee = await getCurrentEmployee();
  if (!currentEmployee) return;

  // 2. 화면 상단에 직원 이름 자동 표시
  if (userName) {
    userName.textContent = currentEmployee.name || "직원";
  }

  // 3. 화면 상단에 오늘 날짜 표시
  setTodayDate();

  // 4. 오늘 출퇴근 기록 불러오기
  await loadTodayAttendance();

  noticeMoreBtn?.addEventListener(
    "click",
    () => {
      location.href = "notices.html";
    }
  );

  await loadHomeNoticeFeed();

}

init();