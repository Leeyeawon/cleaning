const menuItems = document.querySelectorAll(".menu-item");
const excelDownloadBtn = document.getElementById("excelDownloadBtn");

menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    menuItems.forEach((menu) => menu.classList.remove("active"));
    item.classList.add("active");
  });
});

excelDownloadBtn.addEventListener("click", () => {
  alert("엑셀 다운로드 기능은 추후 서버와 연결하면 사용할 수 있습니다.");
});