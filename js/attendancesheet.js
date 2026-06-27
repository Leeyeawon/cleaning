const currentMonthText = document.getElementById("currentMonth");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");

let currentYear = 2025;
let currentMonth = 6;

function updateMonthText() {
  currentMonthText.textContent = `${currentYear}년 ${currentMonth}월`;
}

prevMonthBtn.addEventListener("click", () => {
  currentMonth -= 1;

  if (currentMonth < 1) {
    currentMonth = 12;
    currentYear -= 1;
  }

  updateMonthText();
});

nextMonthBtn.addEventListener("click", () => {
  currentMonth += 1;

  if (currentMonth > 12) {
    currentMonth = 1;
    currentYear += 1;
  }

  updateMonthText();
});

const currentMonthText = document.getElementById("currentMonth");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");

let currentYear = 2025;
let currentMonth = 6;

function updateMonthText() {
  currentMonthText.textContent = `${currentYear}년 ${currentMonth}월`;
}

prevMonthBtn.addEventListener("click", () => {
  currentMonth -= 1;

  if (currentMonth < 1) {
    currentMonth = 12;
    currentYear -= 1;
  }

  updateMonthText();
});

nextMonthBtn.addEventListener("click", () => {
  currentMonth += 1;

  if (currentMonth > 12) {
    currentMonth = 1;
    currentYear += 1;
  }

  updateMonthText();
});