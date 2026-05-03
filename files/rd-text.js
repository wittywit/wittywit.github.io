/**
 * Reaction-Diffusion text fill effect
 * Gray-Scott model — runs at reduced resolution, clipped to letter shapes via canvas compositing
 */
(function () {
  'use strict';

  // Gray-Scott parameters (coral/branching pattern)
  var DA = 1.0, DB = 0.5, F = 0.054, K = 0.063;
  var STEPS = 8;   // simulation steps per animation frame
  var SCALE = 3;   // run RD at 1/SCALE resolution for performance

  // ─── Simulation ───────────────────────────────────────────────

  function makeGrid(w, h) {
    var n = w * h;
    var A = new Float32Array(n).fill(1);
    var B = new Float32Array(n);
    var nA = new Float32Array(n);
    var nB = new Float32Array(n);

    // Seed random perturbation clusters
    var seeds = Math.max(6, Math.floor(n / 250));
    for (var s = 0; s < seeds; s++) {
      var cx = 2 + Math.floor(Math.random() * (w - 4));
      var cy = 2 + Math.floor(Math.random() * (h - 4));
      for (var dy = -2; dy <= 2; dy++) {
        for (var dx = -2; dx <= 2; dx++) {
          var xi = Math.min(w - 1, Math.max(0, cx + dx));
          var yi = Math.min(h - 1, Math.max(0, cy + dy));
          var ii = yi * w + xi;
          A[ii] = 0.5 + Math.random() * 0.1;
          B[ii] = 0.25 + Math.random() * 0.05;
        }
      }
    }
    return { A: A, B: B, nA: nA, nB: nB, w: w, h: h };
  }

  function stepGrid(g) {
    var A = g.A, B = g.B, nA = g.nA, nB = g.nB;
    var w = g.w, h = g.h;

    for (var y = 0; y < h; y++) {
      var yRow = y * w;
      var yTop = (y === 0 ? h - 1 : y - 1) * w;
      var yBot = (y === h - 1 ? 0 : y + 1) * w;

      for (var x = 0; x < w; x++) {
        var i = yRow + x;
        var xL = x === 0 ? w - 1 : x - 1;
        var xR = x === w - 1 ? 0 : x + 1;

        var a = A[i], b = B[i];
        var lA = A[yTop + x] + A[yBot + x] + A[yRow + xL] + A[yRow + xR] - 4 * a;
        var lB = B[yTop + x] + B[yBot + x] + B[yRow + xL] + B[yRow + xR] - 4 * b;
        var abb = a * b * b;

        nA[i] = Math.min(1, Math.max(0, a + DA * lA - abb + F * (1 - a)));
        nB[i] = Math.min(1, Math.max(0, b + DB * lB + abb - (K + F) * b));
      }
    }

    // swap buffers
    var tmp;
    tmp = g.A; g.A = g.nA; g.nA = tmp;
    tmp = g.B; g.B = g.nB; g.nB = tmp;
  }

  // ─── Per-item setup ───────────────────────────────────────────

  function setupItem(item) {
    var link = item.querySelector('.menu__item-link');
    if (!link) return;

    // Overlay canvas, sits above the link text, below the image
    var canvas = document.createElement('canvas');
    canvas.style.cssText = [
      'position:absolute',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 0.5s',
      'z-index:2'
    ].join(';');
    item.style.position = 'relative'; // ensure item is positioned
    item.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var offscreen = document.createElement('canvas');
    var offCtx = offscreen.getContext('2d');

    var grid = null;
    var imgData = null;
    var raf = null;
    var active = false;

    function resize() {
      var itemRect = item.getBoundingClientRect();
      var linkRect = link.getBoundingClientRect();

      var cw = linkRect.width;
      var ch = linkRect.height;
      var cl = linkRect.left - itemRect.left;
      var ct = linkRect.top - itemRect.top;

      canvas.width = cw;
      canvas.height = ch;
      canvas.style.left = cl + 'px';
      canvas.style.top = ct + 'px';
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';

      var sw = Math.max(1, Math.ceil(cw / SCALE));
      var sh = Math.max(1, Math.ceil(ch / SCALE));
      offscreen.width = sw;
      offscreen.height = sh;
      imgData = offCtx.createImageData(sw, sh);

      grid = makeGrid(sw, sh);
    }

    function renderFrame() {
      for (var s = 0; s < STEPS; s++) stepGrid(grid);

      // Write RD values to offscreen image data (grayscale: pattern = dark)
      var A = grid.A, B = grid.B;
      var d = imgData.data;
      var n = grid.w * grid.h;
      for (var i = 0; i < n; i++) {
        var v = Math.max(0, A[i] - B[i]); // ~1 = background, ~0 = pattern
        var c = Math.floor(v * 255);
        var p = i * 4;
        d[p]     = c;
        d[p + 1] = c;
        d[p + 2] = c;
        d[p + 3] = 255;
      }
      offCtx.putImageData(imgData, 0, 0);

      // Draw text shape as a solid mask on display canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      var computedFont = getComputedStyle(link);
      ctx.font = computedFont.fontWeight + ' ' + computedFont.fontSize + ' ' + computedFont.fontFamily;
      ctx.fillStyle = '#000';
      ctx.textBaseline = 'middle';
      ctx.fillText(link.textContent.trim(), 0, canvas.height / 2);

      // Clip RD pattern to text shape — source-in keeps only pixels that overlap the text fill
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';

      if (active) raf = requestAnimationFrame(renderFrame);
    }

    item.addEventListener('mouseenter', function () {
      active = true;
      resize();
      canvas.style.opacity = '1';
      raf = requestAnimationFrame(renderFrame);
    });

    item.addEventListener('mouseleave', function () {
      active = false;
      canvas.style.opacity = '0';
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    });
  }

  // ─── Init ─────────────────────────────────────────────────────

  function init() {
    document.querySelectorAll('.menu__item').forEach(setupItem);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(init);
  } else {
    window.addEventListener('load', init);
  }

})();
