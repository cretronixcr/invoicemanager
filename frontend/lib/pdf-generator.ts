import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function generateInvoicePDF(elementId: string, filename: string = "Invoice.pdf") {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id ${elementId} not found.`);
  }

  // Make sure webfonts are fully loaded before rasterizing, otherwise the
  // PDF can come out with fallback fonts (or blank text while loading).
  try {
    await document.fonts.ready;
  } catch {
    // Older browsers without the CSS Font Loading API — render anyway.
  }

  // Render an offscreen clone instead of the live element. Ancestors
  // (sidebar layout, scroll containers, flex shrink) can otherwise resize or
  // clip the page while html2canvas builds its capture iframe, which squeezes
  // the invoice into a distorted image spanning extra PDF pages.
  const holder = document.createElement("div");
  holder.style.cssText =
    "position:fixed; left:-20000px; top:0; width:max-content; background:#ffffff; pointer-events:none;";
  const clone = element.cloneNode(true) as HTMLElement;
  holder.appendChild(clone);
  document.body.appendChild(holder);

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(clone, {
      scale: 2, // 2x scale for crystal clear crisp fonts and borders
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: Math.max(window.innerWidth, 1200),
      windowHeight: Math.ceil(clone.getBoundingClientRect().height) + 100,
    });
  } finally {
    holder.remove();
  }

  const imgData = canvas.toDataURL("image/png");

  // Standard A4 dimensions in mm: 210 x 297
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;
  let page = 1;

  // First page
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
  heightLeft -= pdfHeight;

  // Multi-page automatic continuation if height exceeds 1 page.
  // (> 1px guard avoids a trailing blank page from float rounding.)
  while (heightLeft > 1) {
    position = -(page * pdfHeight);
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pdfHeight;
    page++;
  }

  // Save PDF
  pdf.save(filename);
}

export function printInvoiceElement(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Invoice</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        </style>
      </head>
      <body class="bg-white p-4">
        ${element.outerHTML}
        <script>
          window.onload = function() {
            window.focus();
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
