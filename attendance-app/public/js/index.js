import supabase from "./supabase.js";

const todayDate = document.getElementById("todayDate");
const userName = document.getElementById("userName");

function setTodayDate() {
  if (!todayDate) return;

  const today = new Date();

  const formatted = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });

  todayDate.textContent = formatted;
}

async function checkAccess() {
  const loginType = localStorage.getItem("employeeLoginType");
  const localUserId = localStorage.getItem("employeeUserId");

  // 구글 로그인 사용자 확인
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let userId = user?.id || localUserId;

  if (!userId) {
    location.href = "../employee/login.html";
    return;
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, name, status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error(error);
    alert("사용자 정보를 확인하는 중 오류가 발생했습니다.");
    location.href = "../employee/login.html";
    return;
  }

  if (!profile) {
    location.href = "../employee/login.html";
    return;
  }

  if (profile.status === "pending") {
    location.href = "../employee/pending.html";
    return;
  }

  if (profile.status === "inactive") {
    alert("비활성화된 계정입니다. 관리자에게 문의해주세요.");
    location.href = "../employee/login.html";
    return;
  }

  if (profile.status !== "active") {
    location.href = "../employee/pending.html";
    return;
  }

  localStorage.setItem("employeeUserId", profile.id);
  localStorage.setItem("employeeName", profile.name || "직원");

  currentUserId = profile.id;

  if (userName) {
    userName.textContent = profile.name || "직원";
  }
}

async function init() {
  setTodayDate();
  await checkAccess();
  await loadTodayAttendance();
}

init();

const attendanceBtn = document.getElementById("attendanceBtn");
const buttonText = document.getElementById("buttonText");
const workStatus = document.getElementById("workStatus");
const checkInTime = document.getElementById("checkInTime");
const checkOutTime = document.getElementById("checkOutTime");

let currentUserId = null;
let todayAttendance = null;

// 두 GPS 좌표 사이 거리 계산
function getDistanceMeter(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = Math.PI / 180;

  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// 현재 위치 가져오기
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
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

// 오늘 날짜 YYYY-MM-DD
function getTodayString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

// 시간 표시
function formatTime(dateString) {
  if (!dateString) return "--:--";

  const date = new Date(dateString);

  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function loadTodayAttendance() {
  if (!currentUserId) return;

  const today = getTodayString();

  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", currentUserId)
    .eq("work_date", today)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  todayAttendance = data;

  updateAttendanceUI();
}

function updateAttendanceUI() {
  if (!todayAttendance) {
    workStatus.textContent = "출근 전";
    buttonText.textContent = "출근하기";
    checkInTime.textContent = "--:--";
    checkOutTime.textContent = "--:--";
    return;
  }

  checkInTime.textContent = formatTime(todayAttendance.check_in_time);
  checkOutTime.textContent = formatTime(todayAttendance.check_out_time);

  if (todayAttendance.check_in_time && !todayAttendance.check_out_time) {
    workStatus.textContent = "근무 중";
    buttonText.textContent = "퇴근하기";
    return;
  }

  if (todayAttendance.check_in_time && todayAttendance.check_out_time) {
    workStatus.textContent = "근무 완료";
    buttonText.textContent = "퇴근 완료";
    attendanceBtn.disabled = true;
    return;
  }
}

async function findAvailableWorkplace(latitude, longitude) {
  const { data: assignments, error } = await supabase
    .from("workplace_users")
    .select(`
      workplace_id,
      workplaces (
        id,
        name,
        latitude,
        longitude,
        radius_m,
        is_active
      )
    `)
    .eq("user_id", currentUserId);

  if (error) {
    console.error(error);
    throw new Error("배정된 근무지를 불러오지 못했습니다.");
  }

  if (!assignments || assignments.length === 0) {
    throw new Error("배정된 근무지가 없습니다. 관리자에게 문의해주세요.");
  }

  for (const item of assignments) {
    const workplace = item.workplaces;

    if (!workplace || !workplace.is_active) continue;

    const distance = getDistanceMeter(
      latitude,
      longitude,
      Number(workplace.latitude),
      Number(workplace.longitude)
    );

    if (distance <= workplace.radius_m) {
      return {
        ...workplace,
        distance
      };
    }
  }

  throw new Error("현재 위치가 배정된 근무지 범위 밖입니다.");
}

async function checkIn() {
  const position = await getCurrentPosition();

  const workplace = await findAvailableWorkplace(
    position.latitude,
    position.longitude
  );

  const { data, error } = await supabase
    .from("attendance")
    .insert({
      user_id: currentUserId,
      workplace_id: workplace.id,
      work_date: getTodayString(),
      check_in_time: new Date().toISOString(),
      check_in_latitude: position.latitude,
      check_in_longitude: position.longitude,
      status: "working"
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    throw new Error("출근 저장에 실패했습니다.");
  }

  todayAttendance = data;
  updateAttendanceUI();

  alert(`${workplace.name} 출근 완료`);
}

async function checkOut() {
  const position = await getCurrentPosition();

  const workplace = await findAvailableWorkplace(
    position.latitude,
    position.longitude
  );

  const { data, error } = await supabase
    .from("attendance")
    .update({
      check_out_time: new Date().toISOString(),
      check_out_latitude: position.latitude,
      check_out_longitude: position.longitude,
      status: "done"
    })
    .eq("id", todayAttendance.id)
    .select()
    .single();

  if (error) {
    console.error(error);
    throw new Error("퇴근 저장에 실패했습니다.");
  }

  todayAttendance = data;
  updateAttendanceUI();

  alert(`${workplace.name} 퇴근 완료`);
}

attendanceBtn?.addEventListener("click", async () => {
  try {
    attendanceBtn.disabled = true;
    buttonText.textContent = "위치 확인 중...";

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

    if (!todayAttendance?.check_out_time) {
      attendanceBtn.disabled = false;
    }
  }
});