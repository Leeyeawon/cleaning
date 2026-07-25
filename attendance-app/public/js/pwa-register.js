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
      "image/svg+xml";

    iconLink.href =
      "./icons/app-icon.svg";

    document.head.appendChild(
      iconLink
    );
  }
}

async function registerEmployeePwa() {
  addPwaMetadata();

  if (
    !(
      "serviceWorker" in
      navigator
    )
  ) {
    return;
  }

  const isSecure =
    location.protocol ===
      "https:" ||
    location.hostname ===
      "localhost" ||
    location.hostname ===
      "127.0.0.1";

  if (!isSecure) {
    console.warn(
      "PWA 서비스 워커는 HTTPS 환경에서만 등록됩니다."
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
      "PWA 서비스 워커 등록 완료:",
      registration.scope
    );
  } catch (error) {
    console.error(
      "PWA 서비스 워커 등록 실패:",
      error
    );
  }
}

registerEmployeePwa();