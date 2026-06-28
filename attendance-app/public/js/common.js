// <!-- 년,월,일,요일 -->
function updateDateTime() {
  const todayDate = document.getElementById("todayDate");
  const currentTime = document.getElementById("currentTime");

  const now = new Date();

  if (todayDate) {
    todayDate.textContent = now.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  }

  if (currentTime) {
    currentTime.textContent = now.toLocaleTimeString("ko-KR");
  }
}

updateDateTime();
setInterval(updateDateTime, 1000);


// <!--   -->