export const PDF_VIEWER_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    html, body { margin: 0; background: #525252; }
    canvas { display: block; margin: 8px auto; max-width: 100%; }
  </style>
</head>
<body>
  <div id="viewer"></div>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    function renderPdf(data) {
      return pdfjsLib.getDocument({ data: data }).promise.then(function (pdf) {
        var host = document.getElementById('viewer');
        var chain = Promise.resolve();
        for (var i = 1; i <= pdf.numPages; i++) {
          (function (pageNum) {
            chain = chain.then(function () {
              return pdf.getPage(pageNum).then(function (page) {
                var unscaled = page.getViewport({ scale: 1 });
                var scale = Math.min((window.innerWidth - 16) / unscaled.width, 2);
                var viewport = page.getViewport({ scale: scale });
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                host.appendChild(canvas);
                return page.render({ canvasContext: ctx, viewport: viewport }).promise;
              });
            });
          })(i);
        }
        return chain;
      });
    }

    fetch('catalog.pdf')
      .then(function (res) { return res.arrayBuffer(); })
      .then(function (buf) { return renderPdf(new Uint8Array(buf)); })
      .catch(function () {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage('pdf-failed');
        }
        document.body.innerHTML =
          '<p style="color:#fff;padding:16px;font-family:sans-serif">Could not display this catalog.</p>';
      });
  </script>
</body>
</html>
`;
