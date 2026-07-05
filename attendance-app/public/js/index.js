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

let currentEmployee = null;
let todayAttendance = null;

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

function formatTime(dateString) {
  if (!dateString) return "--:--";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

attendanceBtn?.addEventListener("click", async () => {
  try {
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
    console.error(error);
  } finally {
    updateAttendanceUI();

    if (!todayAttendance?.check_out_time && attendanceBtn) {
      attendanceBtn.disabled = false;
    }
  }
});

async function init() {
  currentEmployee = await checkAccess();

  if (!currentEmployee) return;

  selectedDate = toDateKey(new Date());

  updateMonthTitle();
  await loadMonthlyAttendance();
}

init();