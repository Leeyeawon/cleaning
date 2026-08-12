function openPrintWindow(
  title,
  content,
  pageStyle = ""
) {
  const oldFrame =
    document.getElementById(
      "attendancePrintFrame"
    );

  if (oldFrame) {
    oldFrame.remove();
  }

  const printFrame =
    document.createElement("iframe");

  printFrame.id =
    "attendancePrintFrame";

  printFrame.setAttribute(
    "title",
    "출근부 인쇄"
  );

  Object.assign(
    printFrame.style,
    {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "0",
      visibility: "hidden",
    }
  );

  document.body.appendChild(
    printFrame
  );

  const printDocument =
    printFrame.contentDocument;

  printDocument.open();

  printDocument.write(`
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8">

        <title>
          ${escapeHtml(title)}
        </title>

        <style>
          @page {
            margin: 7mm;
            ${pageStyle}
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;

            color: #111111;

            font-family:
              "Malgun Gothic",
              "Apple SD Gothic Neo",
              sans-serif;
          }

          body {
            width: 100%;
          }

          .print-document {
            width: 100%;
          }

          .print-header {
            margin-bottom: 4mm;
            text-align: center;
          }

          .print-header h1 {
            margin: 0;

            font-size: 17pt;
            line-height: 1.25;
          }

          .print-header p {
            margin: 2mm 0 0;

            color: #333333;
            font-size: 9pt;
          }

          table {
            width: 100%;

            border-collapse: collapse;
            table-layout: fixed;
          }

          th,
          td {
            border: 1px solid #555555;

            text-align: center;
            vertical-align: middle;
          }

          th {
            background: #eeeeee;
            font-weight: 700;

            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .weekend {
            background: #f7f7f7;

            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .annual-leave-cell {
            background: #fff4cc;
            color: #8a5a00;
            font-weight: 700;

            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .late-cell {
            background: #fee2e2;
            color: #b91c1c;
            font-weight: 700;

            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print-legend {
            display: flex;
            justify-content: flex-end;
            gap: 12px;

            margin-top: 3mm;
            font-size: 8pt;
          }

          .print-signature {
            margin-top: 3mm;

            text-align: right;
            font-size: 9pt;
          }

          ${content.styles || ""}
        </style>
      </head>

      <body>
        ${content.html}
      </body>
    </html>
  `);

  printDocument.close();

  printFrame.onload = () => {
    const printWindow =
      printFrame.contentWindow;

    window.setTimeout(
      () => {
        printWindow.focus();
        printWindow.print();
      },
      200
    );

    printWindow.onafterprint =
      () => {
        printFrame.remove();
      };
  };
}