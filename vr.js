/**
 * VR Fusional Vergence — Patient VR View
 * Receives commands from Controller via PeerJS
 */
(function () {
  'use strict';

  // ─── State ─────────────────────────────────────
  const vrState = {
    currentStep: 0,
    ipd: VR_CONFIG.defaultIPD,    // mm
    ppi: VR_CONFIG.device.ppi,
    mode: 'BO',                   // 'BO' (base-out/convergence) or 'BI' (base-in/divergence)
    connected: false,
    peer: null,
    conn: null,
    roomCode: '',
  };

  // ─── DOM ───────────────────────────────────────
  const $ = id => document.getElementById(id);

  // ─── Pixel Helpers ─────────────────────────────
  function getEffectivePPI() {
    // Use devicePixelRatio to adjust
    const ratio = window.devicePixelRatio || 1;
    // CSS pixels PPI = physical PPI / devicePixelRatio
    return vrState.ppi / ratio;
  }

  function cmToPx(cm) {
    return cm * (getEffectivePPI() / 2.54);
  }

  function mmToPx(mm) {
    return mm * (getEffectivePPI() / 25.4);
  }

  // ─── Draw Lines ────────────────────────────────
  function renderLines() {
    const lineLenPx = cmToPx(VR_CONFIG.lineLengthCm); // 3cm per side
    const thick = VR_CONFIG.lineThicknessPx;
    const dotSize = VR_CONFIG.dotSizePx;

    // --- Left Eye: Horizontal line ---
    const hLineLeft = $('hLineLeft');
    const hLineRight = $('hLineRight');
    // Position relative to center of eye-view
    // Line left: from center going left by lineLenPx
    hLineLeft.style.width = lineLenPx + 'px';
    hLineLeft.style.height = thick + 'px';
    hLineLeft.style.right = '50%';
    hLineLeft.style.left = 'auto';
    hLineLeft.style.marginRight = (dotSize / 2) + 'px';

    // Line right: from center going right by lineLenPx
    hLineRight.style.width = lineLenPx + 'px';
    hLineRight.style.height = thick + 'px';
    hLineRight.style.left = '50%';
    hLineRight.style.right = 'auto';
    hLineRight.style.marginLeft = (dotSize / 2) + 'px';

    // --- Right Eye: Vertical line ---
    const vLineTop = $('vLineTop');
    const vLineBottom = $('vLineBottom');

    vLineTop.style.height = lineLenPx + 'px';
    vLineTop.style.width = thick + 'px';
    vLineTop.style.bottom = '50%';
    vLineTop.style.top = 'auto';
    vLineTop.style.marginBottom = (dotSize / 2) + 'px';

    vLineBottom.style.height = lineLenPx + 'px';
    vLineBottom.style.width = thick + 'px';
    vLineBottom.style.top = '50%';
    vLineBottom.style.bottom = 'auto';
    vLineBottom.style.marginTop = (dotSize / 2) + 'px';

    // Dots
    $('dotLeft').style.width = dotSize + 'px';
    $('dotLeft').style.height = dotSize + 'px';
    $('dotRight').style.width = dotSize + 'px';
    $('dotRight').style.height = dotSize + 'px';
  }

  // ─── Apply Shift ──────────────────────────────
  function applyShift() {
    const step = VR_CONFIG.steps[vrState.currentStep];
    const shiftPx = cmToPx(step.shiftCm);

    const leftContent = $('leftContent');
    const rightContent = $('rightContent');

    if (vrState.mode === 'BO') {
      // Base-Out (convergence): left shifts left, right shifts right
      leftContent.style.transform = 'translateX(' + (-shiftPx) + 'px)';
      rightContent.style.transform = 'translateX(' + shiftPx + 'px)';
    } else {
      // Base-In (divergence): left shifts right, right shifts left
      leftContent.style.transform = 'translateX(' + shiftPx + 'px)';
      rightContent.style.transform = 'translateX(' + (-shiftPx) + 'px)';
    }
  }

  // ─── Apply IPD ─────────────────────────────────
  function applyIPD() {
    const halfIPDpx = mmToPx(vrState.ipd) / 2;
    const screenCenterPx = window.innerWidth / 2;
    const halfWidth = screenCenterPx; // each eye view is half screen

    // Offset each eye-view content toward/away from divider
    // Left eye: shift content right (toward divider)
    // Right eye: shift content left (toward divider)
    const leftEye = $('leftEye');
    const rightEye = $('rightEye');

    // The content should be positioned so that the dots are IPD apart
    // Each half is halfWidth wide. The dot should be at halfIPDpx from screen center.
    // So dot should be at: halfWidth - (halfWidth - halfIPDpx) from left edge of each half
    // = halfIPDpx from the divider side
    const offsetFromCenter = halfWidth / 2; // default center of each half
    const desiredPos = halfWidth - halfIPDpx; // distance from outer edge
    const nudge = desiredPos - offsetFromCenter;

    leftEye.style.paddingRight = Math.max(0, -nudge * 2) + 'px';
    leftEye.style.paddingLeft = Math.max(0, nudge * 2) + 'px';
    rightEye.style.paddingLeft = Math.max(0, -nudge * 2) + 'px';
    rightEye.style.paddingRight = Math.max(0, nudge * 2) + 'px';
  }

  // ─── Handle Commands ───────────────────────────
  function handleCommand(data) {
    switch (data.type) {
      case 'update':
        vrState.currentStep = Math.max(0, Math.min(data.step, VR_CONFIG.steps.length - 1));
        if (data.mode) vrState.mode = data.mode;
        if (data.ipd) {
          vrState.ipd = data.ipd;
          applyIPD();
        }
        applyShift();
        break;

      case 'reset':
        vrState.currentStep = 0;
        applyShift();
        break;

      case 'ipd':
        vrState.ipd = data.value;
        applyIPD();
        break;

      case 'mode':
        vrState.mode = data.value;
        applyShift();
        break;

      case 'ppi':
        vrState.ppi = data.value;
        renderLines();
        applyShift();
        applyIPD();
        break;
    }
  }

  // ─── PeerJS Connection ─────────────────────────
  function initPeer() {
    vrState.roomCode = generateRoomCode();
    $('roomCode').textContent = vrState.roomCode;

    const peerId = 'optovr-' + vrState.roomCode.toLowerCase();
    vrState.peer = new Peer(peerId, { debug: 0 });

    vrState.peer.on('open', function () {
      console.log('[VR] Peer ready, ID:', peerId);
    });

    vrState.peer.on('connection', function (conn) {
      vrState.conn = conn;
      console.log('[VR] Controller connected');

      conn.on('open', function () {
        vrState.connected = true;
        // Update UI
        $('connectOverlay').classList.add('hidden');
        $('connIndicator').classList.add('connected');

        const statusDot = $('connectOverlay').querySelector('.status-dot');
        const statusText = $('connectStatus');
        if (statusDot) statusDot.className = 'status-dot connected';
        if (statusText) statusText.innerHTML = '<span class="status-dot connected"></span> Controller connected!';

        // Send confirmation
        conn.send({ type: 'connected', roomCode: vrState.roomCode });

        // Request fullscreen
        requestFullscreen();
      });

      conn.on('data', function (data) {
        handleCommand(data);
      });

      conn.on('close', function () {
        vrState.connected = false;
        $('connIndicator').classList.remove('connected');
        $('connectOverlay').classList.remove('hidden');
        const statusDot = $('connectOverlay').querySelector('.status-dot');
        if (statusDot) statusDot.className = 'status-dot waiting';
        $('connectStatus').innerHTML = '<span class="status-dot waiting"></span> Controller disconnected. Waiting...';
      });
    });

    vrState.peer.on('error', function (err) {
      console.error('[VR] Peer error:', err);
      $('connectStatus').innerHTML = '<span class="status-dot waiting"></span> Error: ' + err.type + '. Retrying...';
      // Retry after delay
      setTimeout(initPeer, 3000);
    });
  }

  function requestFullscreen() {
    const el = document.documentElement;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
    if (rfs) {
      rfs.call(el).catch(function () { /* ignore */ });
    }
    // Lock to landscape if supported
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(function () { /* ignore */ });
    }
  }

  // ─── Init ──────────────────────────────────────
  function init() {
    renderLines();
    applyIPD();
    applyShift();
    initPeer();

    window.addEventListener('resize', function () {
      renderLines();
      applyIPD();
      applyShift();
    });

    // Tap to go fullscreen
    document.addEventListener('click', function () {
      if (vrState.connected) requestFullscreen();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
