import { getCurrentEmployee } from "./employeeAuth.js";

async function init() {
  const employee = await getCurrentEmployee();

  if (!employee) return;

  // 기존 request 페이지 기능은 여기 아래에서 실행
}

init();