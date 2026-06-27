const attendanceBtn = document.getElementById("attendanceBtn");
const buttonText = document.getElementById("buttonText");
const workStatus = document.getElementById("workStatus");
const checkInTime = document.getElementById("checkInTime");
const checkOutTime = document.getElementById("checkOutTime");

let attendanceState = "before";
// before: 출근 전
// working: 근무 중
// done: 근무 완료

function getCurrentTime() {
  const now = new Date();

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

attendanceBtn.addEventListener("click", () => {
  if (attendanceState === "before") {
    checkInTime.textContent = getCurrentTime();
    checkInTime.style.color = "#171717";

    workStatus.textContent = "근무 중";
    buttonText.textContent = "퇴근하기";

    attendanceState = "working";
    return;
  }

  if (attendanceState === "working") {
    checkOutTime.textContent = getCurrentTime();
    checkOutTime.style.color = "#171717";

    workStatus.textContent = "근무 완료";
    buttonText.textContent = "근무 완료";

    attendanceBtn.classList.add("disabled");
    attendanceState = "done";
    return;
  }

  if (attendanceState === "done") {
    alert("오늘 출퇴근 기록이 이미 완료되었습니다.");
  }
});