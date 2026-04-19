/**
 * VR Fusional Vergence — Controller (Doctor's Phone)
 * Sends commands to VR device via PeerJS
 */
(function () {
  'use strict';

  // ─── State ─────────────────────────────────────
  const ctrl = {
    currentStep: 0,
    mode: 'BO',       // 'BO' or 'BI'
    ipd: VR_CONFIG.defaultIPD,
    connected: false,
    peer: null,
    conn: null,
  };

  // ─── DOM ───────────────────────────────────────
  const $ = id => document.getElementById(id);

  function showToast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
  }

  // ─── Connection ────────────────────────────────
  function connect() {
    const code = $('inputRoomCode').value.trim().toUpperCase();
    if (code.length < 4) {
      $('connectHint').textContent = 'Please enter a valid room code.';
      return;
    }

    $('connectHint').textContent = 'Connecting...';
    $('btnConnect').disabled = true;

    const myId = 'optoctrl-' + Date.now();
    ctrl.peer = new Peer(myId, { debug: 0 });

    ctrl.peer.on('open', function () {
      const targetId = 'optovr-' + code.toLowerCase();
      ctrl.conn = ctrl.peer.connect(targetId, { reliable: true });

      ctrl.conn.on('open', function () {
        ctrl.connected = true;
        onConnected();
      });

      ctrl.conn.on('data', function (data) {
        if (data.type === 'connected') {
          console.log('[Controller] VR confirmed connection');
        }
      });

      ctrl.conn.on('close', function () {
        ctrl.connected = false;
        onDisconnected();
      });

      ctrl.conn.on('error', function (err) {
        $('connectHint').textContent = 'Connection error: ' + err;
        $('btnConnect').disabled = false;
      });

      // Timeout for connection
      setTimeout(function () {
        if (!ctrl.connected) {
          $('connectHint').textContent = 'Could not connect. Check the code and try again.';
          $('btnConnect').disabled = false;
        }
      }, 10000);
    });

    ctrl.peer.on('error', function (err) {
      $('connectHint').textContent = 'Error: ' + err.type;
      $('btnConnect').disabled = false;
    });
  }

  function onConnected() {
    $('connDot').classList.add('connected');
    $('connText').textContent = 'Connected';
    $('connectSection').classList.add('hidden');
    $('mainControls').classList.add('visible');
    showToast('Connected to VR device!');

    // Send initial state
    sendUpdate();
  }

  function onDisconnected() {
    $('connDot').classList.remove('connected');
    $('connText').textContent = 'Disconnected';
    $('connectSection').classList.remove('hidden');
    $('mainControls').classList.remove('visible');
    $('btnConnect').disabled = false;
    $('connectHint').textContent = 'Connection lost. Re-enter code to reconnect.';
    showToast('Disconnected from VR device');
  }

  function sendCommand(data) {
    if (ctrl.connected && ctrl.conn) {
      ctrl.conn.send(data);
    }
  }

  function sendUpdate() {
    const step = VR_CONFIG.steps[ctrl.currentStep];
    sendCommand({
      type: 'update',
      step: ctrl.currentStep,
      shiftCm: step.shiftCm,
      prism: step.prism,
      mode: ctrl.mode,
      ipd: ctrl.ipd,
    });
  }

  // ─── UI Updates ────────────────────────────────
  function updateUI() {
    const step = VR_CONFIG.steps[ctrl.currentStep];

    // Prism display
    $('prismValue').textContent = step.prism;
    $('stepNum').textContent = ctrl.currentStep;
    $('shiftValue').textContent = step.shiftCm.toFixed(3);

    // Step table highlighting
    const rows = document.querySelectorAll('.step-row[data-step]');
    rows.forEach(row => {
      const rowStep = parseInt(row.getAttribute('data-step'));
      row.classList.remove('active', 'passed');
      if (rowStep === ctrl.currentStep) {
        row.classList.add('active');
      } else if (rowStep < ctrl.currentStep) {
        row.classList.add('passed');
      }
    });

    // Mode buttons
    $('btnBO').classList.toggle('active', ctrl.mode === 'BO');
    $('btnBI').classList.toggle('active', ctrl.mode === 'BI');

    // IPD
    $('ipdValue').textContent = ctrl.ipd;
  }

  // ─── Actions ───────────────────────────────────
  function stepForward() {
    if (ctrl.currentStep >= VR_CONFIG.steps.length - 1) {
      showToast('Maximum step reached (38Δ)');
      return;
    }
    ctrl.currentStep++;
    updateUI();
    sendUpdate();
  }

  function stepBackward() {
    if (ctrl.currentStep <= 0) {
      showToast('Already at starting position');
      return;
    }
    ctrl.currentStep--;
    updateUI();
    sendUpdate();
  }

  function resetSteps() {
    ctrl.currentStep = 0;
    updateUI();
    sendCommand({ type: 'reset' });
    showToast('Reset to initial position');
  }

  function setMode(mode) {
    ctrl.mode = mode;
    ctrl.currentStep = 0;
    updateUI();
    sendUpdate();
    showToast(mode === 'BO' ? 'Base-Out (Convergence)' : 'Base-In (Divergence)');
  }

  function setIPD(value) {
    ctrl.ipd = parseInt(value);
    $('ipdValue').textContent = ctrl.ipd;
    sendCommand({ type: 'ipd', value: ctrl.ipd });
  }

  function recordBreak() {
    const step = VR_CONFIG.steps[ctrl.currentStep];
    $('breakVal').textContent = step.prism + 'Δ (Step ' + ctrl.currentStep + ')';
    showToast('Break point recorded: ' + step.prism + 'Δ');
  }

  function recordRecovery() {
    const step = VR_CONFIG.steps[ctrl.currentStep];
    $('recoveryVal').textContent = step.prism + 'Δ (Step ' + ctrl.currentStep + ')';
    showToast('Recovery point recorded: ' + step.prism + 'Δ');
  }

  function clearResults() {
    $('breakVal').textContent = '—';
    $('recoveryVal').textContent = '—';
    showToast('Results cleared');
  }

  // ─── Event Binding ─────────────────────────────
  function bindEvents() {
    $('btnConnect').addEventListener('click', connect);
    $('inputRoomCode').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') connect();
    });

    $('btnPlus').addEventListener('click', stepForward);
    $('btnMinus').addEventListener('click', stepBackward);
    $('btnReset').addEventListener('click', resetSteps);

    $('btnBO').addEventListener('click', () => setMode('BO'));
    $('btnBI').addEventListener('click', () => setMode('BI'));

    $('ipdSlider').addEventListener('input', function () {
      setIPD(this.value);
    });

    $('btnBreak').addEventListener('click', recordBreak);
    $('btnRecovery').addEventListener('click', recordRecovery);
    $('btnClearResults').addEventListener('click', clearResults);

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
      if (document.activeElement === $('inputRoomCode')) return;
      switch (e.key) {
        case '+': case '=': case 'ArrowRight': case 'ArrowUp':
          e.preventDefault(); stepForward(); break;
        case '-': case 'ArrowLeft': case 'ArrowDown':
          e.preventDefault(); stepBackward(); break;
        case 'r': case 'R':
          if (!e.ctrlKey) { e.preventDefault(); resetSteps(); } break;
        case 'b': case 'B':
          e.preventDefault(); recordBreak(); break;
      }
    });

    // Touch support
    document.querySelectorAll('.btn-move, .btn-record, .mode-btn').forEach(btn => {
      btn.addEventListener('touchend', function (e) {
        e.preventDefault();
        btn.click();
      });
    });
  }

  // ─── Init ──────────────────────────────────────
  function init() {
    bindEvents();
    updateUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
