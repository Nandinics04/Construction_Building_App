function pdfViewerShell(loadScript: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #525659;
      min-height: 100%;
    }
    #status {
      color: #fff;
      font-family: sans-serif;
      text-align: center;
      padding: 24px;
    }
    canvas {
      display: block;
      margin: 12px auto;
      max-width: 100%;
      height: auto;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
      background: #fff;
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body>
  <div id="status">Opening catalog…</div>
  <div id="pages"></div>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    function notify(message) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(message);
      }
    }

    async function renderPdf(source) {
      const pdf = await pdfjsLib.getDocument({ ...source, disableWorker: true }).promise;
      document.getElementById('status').style.display = 'none';
      const pages = document.getElementById('pages');
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.4 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        pages.appendChild(canvas);
        await page.render({ canvasContext: context, viewport }).promise;
      }
      notify('ready');
    }

    (async () => {
      try {
        ${loadScript}
      } catch (error) {
        document.getElementById('status').textContent =
          'Could not display this catalog.';
        notify('error:' + (error && error.message ? error.message : String(error)));
      }
    })();
  </script>
</body>
</html>`;
}

export function buildPdfHtmlFromUrl(url: string) {
  return pdfViewerShell(`await renderPdf({ url: ${JSON.stringify(url)} });`);
}

export function buildPdfHtmlFromBase64(base64: string) {
  return pdfViewerShell(`
        const raw = atob(${JSON.stringify(base64)});
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
          bytes[i] = raw.charCodeAt(i);
        }
        await renderPdf({ data: bytes });
  `);
}
