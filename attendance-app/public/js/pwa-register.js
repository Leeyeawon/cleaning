window.employeePwaInstallPrompt =
  null;


window.addEventListener(
  "beforeinstallprompt",
  (event) => {
    event.preventDefault();

    window.employeePwaInstallPrompt =
      event;

    window.dispatchEvent(
      new CustomEvent(
        "employee-pwa-install-ready"
      )
    );

    console.log(
      "PWA 설치 준비 완료"
    );
  }
);


function addPwaMetadata() {
  if (
    !document.querySelector(
      'link[rel="manifest"]'
    )
  ) {
    const manifestLink =
      document.createElement(
        "link"
      );

    manifestLink.rel =
      "manifest";

    manifestLink.href =
      "./manifest.json";

    document.head.appendChild(
      manifestLink
    );
  }

  if (
    !document.querySelector(
      'meta[name="theme-color"]'
    )
  ) {
    const themeMeta =
      document.createElement(
        "meta"
      );

    themeMeta.name =
      "theme-color";

    themeMeta.content =
      "#171717";

    document.head.appendChild(
      themeMeta
    );
  }

  if (
    !document.querySelector(
      'link[rel="icon"]'
    )
  ) {
    const iconLink =
      document.createElement(
        "link"
      );

    iconLink.rel =
      "icon";

    iconLink.type =
      "image/png";

    iconLink.href =
      "./icons/app-icon-192.png";

    document.head.appendChild(
      iconLink
    );
  }
}

let isPwaReloading = false;

navigator.serviceWorker?.addEventListener(
  "controllerchange",
  () => {
    if (isPwaReloading) return;

    isPwaReloading = true;

    window.location.reload();
  }
);

async function registerEmployeePwa() {
  addPwaMetadata();

  if (
    !(
      "serviceWorker" in
      navigator
    )
  ) {
    console.warn(
      "서비스워커를 지원하지 않는 브라우저입니다."
    );

    return;
  }

  const isSecure =
    location.protocol === "https:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  if (!isSecure) {
    console.warn(
      "PWA는 HTTPS에서만 설치할 수 있습니다."
    );

    return;
  }

  try {
    const registration =
      await navigator
        .serviceWorker
        .register(
          "./service-worker.js",
          {
            scope: "./",
          }
        );

    await registration.update();

    console.log(
      "PWA 서비스워커 등록 완료:",
      registration.scope
    );
  } catch (error) {
    console.error(
      "PWA 서비스워커 등록 실패:",
      error
    );
  }
}


registerEmployeePwa();