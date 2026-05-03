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

  // ─── Pixel Helpers (actual device DPI) ──────────
  function cmToPx(cm) {
    // Uses actual device screen resolution / physical size (from shared.js)
    return cm * getDevicePxPerCm().x;
  }

  function cmToPxY(cm) {
    return cm * getDevicePxPerCm().y;
  }

  function mmToPx(mm) {
    return (mm / 10) * getDevicePxPerCm().x;
  }

  // ─── Compute & Apply Layout (CSS Custom Properties) ──
  function computeLayout() {
    const L = VR_CONFIG.layout;
    const pxPerCm = getDevicePxPerCm();

    const containerW = L.containerWidthCm * pxPerCm.x;   // 15cm in device px
    const containerH = L.containerHeightCm * pxPerCm.y;   // 6.8cm in device px
    const eyeW       = L.eyeWidthCm * pxPerCm.x;          // 7.5cm in device px
    const dotTop      = L.dotFromTopCm * pxPerCm.y;        // 3.4cm from top in device px
    const dotFromEdge = L.dotFromEdgeCm * pxPerCm.x;       // 3.75cm from edge in device px

    // Set CSS custom properties on the container
    const container = $('vrContainer');
    container.style.setProperty('--container-w', containerW + 'px');
    container.style.setProperty('--container-h', containerH + 'px');
    container.style.setProperty('--eye-w', eyeW + 'px');
    container.style.setProperty('--dot-top', dotTop + 'px');
    container.style.setProperty('--dot-from-edge', dotFromEdge + 'px');

    console.log('[VR] Layout computed — pxPerCm:', pxPerCm,
      '| container:', containerW.toFixed(1) + 'x' + containerH.toFixed(1) + 'px',
      '| eyeW:', eyeW.toFixed(1) + 'px',
      '| dotTop:', dotTop.toFixed(1) + 'px',
      '| dotFromEdge:', dotFromEdge.toFixed(1) + 'px');
  }

  // ─── Draw Lines ────────────────────────────────
  function renderLines() {
    const lineLenPx = cmToPx(VR_CONFIG.layout.lineLengthCm); // 3cm per side in device px
    const thick = VR_CONFIG.lineThicknessPx;
    const dotSize = VR_CONFIG.dotSizePx;

    // --- Left Eye: Horizontal line ---
    const hLineLeft = $('hLineLeft');
    const hLineRight = $('hLineRight');
    hLineLeft.style.width = lineLenPx + 'px';
    hLineLeft.style.height = thick + 'px';
    hLineLeft.style.right = '50%';
    hLineLeft.style.left = 'auto';
    hLineLeft.style.marginRight = (dotSize / 2) + 'px';

    hLineRight.style.width = lineLenPx + 'px';
    hLineRight.style.height = thick + 'px';
    hLineRight.style.left = '50%';
    hLineRight.style.right = 'auto';
    hLineRight.style.marginLeft = (dotSize / 2) + 'px';

    // --- Right Eye: Vertical line ---
    const vLineTop = $('vLineTop');
    const vLineBottom = $('vLineBottom');

    vLineTop.style.height = cmToPxY(VR_CONFIG.layout.lineLengthCm) + 'px';
    vLineTop.style.width = thick + 'px';
    vLineTop.style.bottom = '50%';
    vLineTop.style.top = 'auto';
    vLineTop.style.marginBottom = (dotSize / 2) + 'px';

    vLineBottom.style.height = cmToPxY(VR_CONFIG.layout.lineLengthCm) + 'px';
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
      leftContent.style.transform = 'translateX(' + (-shiftPx) + 'px)';
      rightContent.style.transform = 'translateX(' + shiftPx + 'px)';
    } else {
      leftContent.style.transform = 'translateX(' + shiftPx + 'px)';
      rightContent.style.transform = 'translateX(' + (-shiftPx) + 'px)';
    }
  }

  // ─── Apply IPD ─────────────────────────────────
  function applyIPD() {
    const halfIPDpx = mmToPx(vrState.ipd) / 2;
    // Base distance from divider = eyeWidth - dotFromEdge
    // = 7.5cm - 3.75cm = 3.75cm per side → base IPD = 7.5cm = 75mm
    const baseDistFromDivider = VR_CONFIG.layout.eyeWidthCm - VR_CONFIG.layout.dotFromEdgeCm;
    const baseHalfIPDpx = cmToPx(baseDistFromDivider);

    const offsetPx = halfIPDpx - baseHalfIPDpx;

    const leftContent = $('leftContent');
    const rightContent = $('rightContent');

    leftContent.style.marginLeft = (-offsetPx) + 'px';
    rightContent.style.marginRight = (-offsetPx) + 'px';
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
        computeLayout();
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
    const peerOptions = {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    };
    vrState.peer = new Peer(peerId, peerOptions);

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
    computeLayout();  // Set CSS vars from actual device DPI first
    renderLines();
    applyIPD();
    applyShift();
    initPeer();

    window.addEventListener('resize', function () {
      computeLayout();  // Recompute on resize/orientation change
      renderLines();
      applyIPD();
      applyShift();
    });

    // Tap to go fullscreen
    document.addEventListener('click', function (e) {
      if (e.target.closest('.btn-copy')) return; // let copy button work
      if (vrState.connected) requestFullscreen();
    });

    if ($('btnCopy')) {
      $('btnCopy').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(vrState.roomCode);
          $('btnCopy').textContent = '✅';
          setTimeout(() => $('btnCopy').textContent = '📋', 2000);
        } catch (err) {
          console.error('Failed to copy', err);
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
