/**
 * GuardAgent AI — Frontend Controller & Visual Simulator
 * Amazon Developer Hackathon 2026 - Ring Track
 */

class GuardAgentUI {
  constructor() {
    this.canvas = document.getElementById('cameraCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.currentCam = 'doorbell'; // 'doorbell' | 'floodlight'
    this.nightVision = false;
    this.devices = {};
    this.activeScenario = null;
    this.apiCalls = [];
    this.ws = null;
    this.animFrameId = null;
    this.pulseCounter = 0;

    this.initElements();
    this.initCanvas();
    this.initWebSocket();
    this.attachEventListeners();
    this.startRenderLoop();
  }

  initElements() {
    this.elThreatVal = document.getElementById('overlayThreatVal');
    this.elThreatLevel = document.getElementById('overlayThreatLevel');
    this.elThreatBadge = document.getElementById('threatOverlayBadge');
    this.elThreatNumber = document.getElementById('threatNumber');
    this.elThreatStatusBadge = document.getElementById('threatStatusBadge');

    this.elBarVisual = document.getElementById('barVisual');
    this.elValVisual = document.getElementById('valVisualAnomaly');
    this.elBarDwell = document.getElementById('barDwell');
    this.elValDwell = document.getElementById('valDwellTime');
    this.elBarZone = document.getElementById('barZone');
    this.elValZone = document.getElementById('valZoneBreach');
    this.elBarBehavior = document.getElementById('barBehavior');
    this.elValBehavior = document.getElementById('valBehavior');

    this.elLockText = document.getElementById('lockStateText');
    this.btnToggleLock = document.getElementById('btnToggleLock');
    this.elFloodlightText = document.getElementById('floodlightStateText');
    this.btnToggleFloodlight = document.getElementById('btnToggleFloodlight');
    this.elSirenText = document.getElementById('sirenStateText');
    this.btnToggleSiren = document.getElementById('btnToggleSiren');

    this.elIntercomSpeaker = document.getElementById('intercomSpeaker');
    this.elIntercomText = document.getElementById('intercomSpeechText');
    this.elWaveform = document.getElementById('waveformAnim');
    this.elDecisionFeed = document.getElementById('decisionFeed');
    this.elApiLogStream = document.getElementById('apiLogStream');
    this.elApiCallCount = document.getElementById('apiCallCount');
    this.elSirenStrobe = document.getElementById('sirenStrobeOverlay');
    this.elStreamTimestamp = document.getElementById('streamTimestamp');
    this.elCameraName = document.getElementById('currentCameraName');
    this.elModeSelect = document.getElementById('agentModeSelect');
  }

  initCanvas() {
    this.canvas.width = 720;
    this.canvas.height = 420;
  }

  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      document.getElementById('wsStatusText').innerText = 'RING MESH CONNECTED';
      console.log('[WebSocket] Connected to GuardAgent server.');
    };

    this.ws.onclose = () => {
      document.getElementById('wsStatusText').innerText = 'RECONNECTING...';
      setTimeout(() => this.initWebSocket(), 2500);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleSocketMessage(msg);
      } catch (err) {
        console.error('Socket message parse error:', err);
      }
    };
  }

  handleSocketMessage(msg) {
    const { type, payload } = msg;

    switch (type) {
      case 'INITIAL_STATE':
        this.updateDevicesList(payload.devices);
        if (payload.apiLogs) {
          payload.apiLogs.forEach(log => this.addApiLog(log));
        }
        break;

      case 'INCIDENT_TRIGGERED':
        this.handleIncidentTriggered(payload);
        break;

      case 'ACTION_EXECUTED':
        this.handleActionExecuted(payload);
        break;

      case 'DEVICE_UPDATED':
        this.fetchDevices();
        break;

      case 'RING_EVENT':
        if (payload.type === 'two_way_audio_start') {
          this.triggerVoiceAudio(payload.message);
        }
        break;
    }
  }

  async fetchDevices() {
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      if (data.devices) this.updateDevicesList(data.devices);
    } catch (e) {}
  }

  updateDevicesList(deviceList) {
    deviceList.forEach(dev => {
      this.devices[dev.id] = dev;
      if (dev.id === 'smart_deadbolt_front') {
        this.elLockText.innerText = dev.locked ? 'LOCKED (Secure)' : 'UNLOCKED (Open)';
        this.elLockText.style.color = dev.locked ? 'var(--accent-emerald)' : 'var(--accent-amber)';
        this.btnToggleLock.innerText = dev.locked ? 'Unlock' : 'Lock';
      }
      if (dev.id === 'floodlight_driveway') {
        const isOn = dev.lightsOn;
        this.elFloodlightText.innerText = isOn ? `ON (${dev.lightIntensity || 100}%)` : 'OFF (0%)';
        this.elFloodlightText.style.color = isOn ? 'var(--accent-cyan)' : 'var(--text-muted)';
        this.btnToggleFloodlight.innerText = isOn ? 'Lights Off' : 'Lights On';

        const isSiren = dev.sirenActive;
        this.elSirenText.innerText = isSiren ? 'ALARM BLARING (110dB)' : 'STANDBY';
        this.elSirenText.style.color = isSiren ? 'var(--accent-crimson)' : 'var(--accent-emerald)';
        this.btnToggleSiren.innerText = isSiren ? 'Stop Siren' : 'Test Siren';
        if (isSiren) {
          this.elSirenStrobe.classList.add('active');
        } else {
          this.elSirenStrobe.classList.remove('active');
        }
      }
    });
  }

  handleIncidentTriggered(incident) {
    const { event, threatAnalysis, plannedActions } = incident;
    this.activeScenario = event;

    // Update Threat Visuals
    const score = threatAnalysis.threatScorePercent;
    const level = threatAnalysis.level;

    this.elThreatVal.innerText = `${score}%`;
    this.elThreatLevel.innerText = level;
    this.elThreatNumber.innerText = `${score}%`;
    this.elThreatStatusBadge.innerText = level;

    // Set Colors
    let color = '#38bdf8';
    if (level === 'CRITICAL') color = '#ef4444';
    else if (level === 'WARNING') color = '#f59e0b';
    else if (level === 'CAUTION') color = '#eab308';
    else color = '#10b981';

    this.elThreatNumber.style.color = color;
    this.elThreatVal.style.color = color;
    this.elThreatStatusBadge.style.color = color;
    this.elThreatLevel.style.color = color;

    // Update Vector Bars
    this.elBarVisual.style.width = `${threatAnalysis.visualAnomalyScore}%`;
    this.elValVisual.innerText = `${threatAnalysis.visualAnomalyScore}%`;

    this.elBarDwell.style.width = `${threatAnalysis.dwellFactorScore}%`;
    this.elValDwell.innerText = `${event.dwellTimeSeconds || 0}s`;

    this.elBarZone.style.width = `${threatAnalysis.zoneBreachScore}%`;
    this.elValZone.innerText = event.perimeterZoneBreach ? 'BREACH' : 'Clear';

    this.elBarBehavior.style.width = `${threatAnalysis.behaviorScore}%`;
    this.elValBehavior.innerText = `${threatAnalysis.behaviorScore}%`;

    // Add to Decision Feed
    this.addDecisionFeedItem({
      title: `Event Ingested: ${event.title}`,
      description: `Evaluated threat index at ${score}% (${level}). Executing ${plannedActions.length} policy action(s).`,
      level
    });

    // Check if scenario has a camera change
    if (event.deviceId === 'floodlight_driveway' && this.currentCam !== 'floodlight') {
      this.switchCamera('floodlight');
    } else if (event.deviceId === 'doorbell_front' && this.currentCam !== 'doorbell') {
      this.switchCamera('doorbell');
    }

    if (event.ambientLighting === 'NIGHT_LOW_LIGHT') {
      this.nightVision = true;
      document.getElementById('btnNightVision').classList.add('active');
    }
  }

  handleActionExecuted(payload) {
    const { action, details, result } = payload;
    let desc = '';
    let isDanger = false;

    if (action === 'VOICE_INTERCOM_GREET') {
      desc = `Dispatched speech to Ring Doorbell Speaker: "${details.message}"`;
      this.triggerVoiceAudio(details.message);
    } else if (action === 'UNLOCK_SMART_DEADBOLT') {
      desc = `Unlocked Ring Smart Deadbolt (Duration: ${details.temporaryDurationSeconds || 30}s).`;
      this.fetchDevices();
    } else if (action === 'TRIGGER_ALARM_SIREN') {
      desc = `Triggered 110dB Ring Alarm Siren on Floodlight Cam.`;
      isDanger = true;
      this.fetchDevices();
    } else if (action === 'FLOODLIGHT_ILLUMINATE') {
      desc = `Activated Floodlight Cam LEDs at ${details.intensity}% intensity.`;
      this.fetchDevices();
    } else {
      desc = `Action: ${action} executed successfully.`;
    }

    this.addDecisionFeedItem({
      title: `Autonomous Actuation: ${action}`,
      description: desc,
      level: isDanger ? 'CRITICAL' : 'BENIGN'
    });

    // Refresh API calls
    this.refreshApiLogs();
  }

  triggerVoiceAudio(message) {
    this.elIntercomSpeaker.innerText = 'Ring Doorbell Two-Way Intercom (Sentry Speaking)';
    this.elIntercomText.innerText = `"${message}"`;
    this.elWaveform.classList.add('active');

    // Use Web Speech API for audible voice output
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onend = () => {
        this.elWaveform.classList.remove('active');
        this.elIntercomSpeaker.innerText = 'Ring Two-Way Intercom (Idle)';
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        this.elWaveform.classList.remove('active');
        this.elIntercomSpeaker.innerText = 'Ring Two-Way Intercom (Idle)';
      }, 3500);
    }
  }

  addDecisionFeedItem({ title, description, level }) {
    const item = document.createElement('div');
    item.className = `feed-item ${level === 'CRITICAL' ? 'danger' : (level === 'BENIGN' ? 'success' : '')}`;
    const timeStr = new Date().toLocaleTimeString();

    item.innerHTML = `
      <div class="feed-time">${timeStr}</div>
      <div class="feed-content">
        <strong>${title}</strong>
        <p>${description}</p>
      </div>
    `;

    this.elDecisionFeed.insertBefore(item, this.elDecisionFeed.firstChild);
    while (this.elDecisionFeed.children.length > 25) {
      this.elDecisionFeed.removeChild(this.elDecisionFeed.lastChild);
    }
  }

  async refreshApiLogs() {
    try {
      const res = await fetch('/api/ring/api-logs');
      const data = await res.json();
      if (data.logs) {
        this.elApiLogStream.innerHTML = '';
        data.logs.slice(0, 15).forEach(log => this.addApiLog(log));
        this.elApiCallCount.innerText = `${data.logs.length} Calls`;
      }
    } catch (e) {}
  }

  addApiLog(log) {
    const placeholder = this.elApiLogStream.querySelector('.log-placeholder');
    if (placeholder) placeholder.remove();

    const entry = document.createElement('div');
    entry.className = 'api-log-entry';
    const methodClass = (log.method || 'GET').toLowerCase();

    entry.innerHTML = `
      <span class="api-method ${methodClass}">${log.method}</span>
      <span class="api-endpoint">${log.endpoint}</span>
      <span class="api-status">${log.status || 200} OK</span>
    `;

    this.elApiLogStream.appendChild(entry);
  }

  switchCamera(camType) {
    this.currentCam = camType;
    document.getElementById('btnCamDoorbell').classList.toggle('active', camType === 'doorbell');
    document.getElementById('btnCamFloodlight').classList.toggle('active', camType === 'floodlight');
    this.elCameraName.innerText = camType === 'doorbell' ? 'Front Door Pro 2' : 'Driveway Floodlight Cam Wired Pro';
  }

  attachEventListeners() {
    // Scenario triggers
    document.querySelectorAll('.scenario-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const scenario = btn.getAttribute('data-scenario');
        try {
          await fetch('/api/scenarios/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario })
          });
        } catch (e) {
          console.error('Failed to trigger scenario:', e);
        }
      });
    });

    // Camera Switchers
    document.getElementById('btnCamDoorbell').addEventListener('click', () => this.switchCamera('doorbell'));
    document.getElementById('btnCamFloodlight').addEventListener('click', () => this.switchCamera('floodlight'));
    document.getElementById('btnNightVision').addEventListener('click', (e) => {
      this.nightVision = !this.nightVision;
      e.target.classList.toggle('active', this.nightVision);
    });

    // Device Actuator Buttons
    this.btnToggleLock.addEventListener('click', async () => {
      const lockDev = this.devices['smart_deadbolt_front'];
      const newState = lockDev ? !lockDev.locked : false;
      await fetch('/api/devices/smart_deadbolt_front/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lock: newState })
      });
    });

    this.btnToggleFloodlight.addEventListener('click', async () => {
      const floodDev = this.devices['floodlight_driveway'];
      const newState = floodDev ? !floodDev.lightsOn : true;
      await fetch('/api/devices/floodlight_driveway/floodlight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState, intensity: 100 })
      });
    });

    this.btnToggleSiren.addEventListener('click', async () => {
      const floodDev = this.devices['floodlight_driveway'];
      const newState = floodDev ? !floodDev.sirenActive : true;
      await fetch('/api/devices/floodlight_driveway/siren', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newState, durationSeconds: 20 })
      });
    });

    // Mode Selector
    this.elModeSelect.addEventListener('change', async (e) => {
      await fetch('/api/agent/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: e.target.value })
      });
    });
  }

  // =========================================================================
  // Canvas Video Rendering Engine
  // =========================================================================
  startRenderLoop() {
    const render = () => {
      this.pulseCounter += 0.05;
      this.renderScene();
      this.elStreamTimestamp.innerText = new Date().toLocaleTimeString();
      this.animFrameId = requestAnimationFrame(render);
    };
    render();
  }

  renderScene() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    // 1. Draw Background Environment
    if (this.nightVision) {
      ctx.fillStyle = '#061009';
      ctx.fillRect(0, 0, w, h);
    } else if (this.activeScenario && this.activeScenario.ambientLighting === 'NIGHT_LOW_LIGHT') {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, h);
    }

    if (this.currentCam === 'doorbell') {
      this.renderPorchScene(w, h);
    } else {
      this.renderDrivewayScene(w, h);
    }

    // 2. Draw Simulated Entities based on active scenario
    if (this.activeScenario) {
      this.renderScenarioEntities(w, h);
    }

    // 3. Draw Computer Vision Overlays & Bounding Boxes
    this.renderVisionOverlays(w, h);

    // 4. Night Vision Filter Overlay
    if (this.nightVision) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fillRect(0, 0, w, h);
      // Scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
      }
    }
  }

  renderPorchScene(w, h) {
    const { ctx } = this;

    // Porch floor
    ctx.fillStyle = this.nightVision ? '#0d1f14' : '#334155';
    ctx.fillRect(0, 260, w, h - 260);

    // Wall texture
    ctx.fillStyle = this.nightVision ? '#08160e' : '#1e293b';
    ctx.fillRect(0, 0, w, 260);

    // Front Door Frame
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(260, 40, 200, 320);

    // Front Door Panel
    ctx.fillStyle = this.nightVision ? '#13281b' : '#0369a1';
    ctx.fillRect(270, 50, 180, 310);

    // Door Glass window & brass handle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(310, 80, 100, 90);

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(430, 210, 6, 0, Math.PI * 2);
    ctx.fill();

    // Porch Parcel Lockbox
    ctx.fillStyle = '#475569';
    ctx.fillRect(520, 250, 90, 80);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('RING LOCKBOX', 525, 290);

    // Welcome mat
    ctx.fillStyle = '#78350f';
    ctx.fillRect(290, 340, 140, 50);
  }

  renderDrivewayScene(w, h) {
    const { ctx } = this;

    // Driveway asphalt
    ctx.fillStyle = this.nightVision ? '#0d1f14' : '#1e293b';
    ctx.fillRect(0, 200, w, h - 200);

    // House facade & garage
    ctx.fillStyle = this.nightVision ? '#08160e' : '#0f172a';
    ctx.fillRect(0, 0, 480, 220);

    // Garage door lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    for (let y = 50; y < 200; y += 30) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(440, y);
      ctx.stroke();
    }

    // Floodlight beam cone if lights are on
    const floodDev = this.devices['floodlight_driveway'];
    if (floodDev && floodDev.lightsOn) {
      const grad = ctx.createRadialGradient(240, 20, 20, 240, 280, 260);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(240, 20);
      ctx.lineTo(50, 380);
      ctx.lineTo(430, 380);
      ctx.closePath();
      ctx.fill();
    }
  }

  renderScenarioEntities(w, h) {
    const { ctx } = this;
    const scenario = this.activeScenario.scenario;

    if (scenario === 'courier') {
      // Draw Delivery Courier Figure
      ctx.fillStyle = '#ea580c'; // High-vis vest
      ctx.fillRect(330, 140, 60, 130);
      // Head & cap
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.arc(360, 120, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(344, 102, 32, 10);
      // Amazon box
      ctx.fillStyle = '#d97706';
      ctx.fillRect(340, 190, 50, 40);
      // Smile curve
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(365, 208, 12, 0.2, Math.PI - 0.2);
      ctx.stroke();

    } else if (scenario === 'intruder') {
      // Draw Night Intruder
      ctx.fillStyle = '#0f172a'; // Dark hoodie
      ctx.fillRect(340, 150, 55, 140);
      // Masked face
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(367, 130, 17, 0, Math.PI * 2);
      ctx.fill();
      // Crowbar in hand
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(335, 230);
      ctx.lineTo(320, 280);
      ctx.stroke();

    } else if (scenario === 'resident') {
      // Resident Sarah
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(340, 140, 50, 140);
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(365, 120, 16, 0, Math.PI * 2);
      ctx.fill();
      // Keys sparkle
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(385, 210, 8, 8);

    } else if (scenario === 'animal') {
      // Neighborhood cat
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(380, 310, 45, 24);
      ctx.beginPath();
      ctx.arc(425, 316, 12, 0, Math.PI * 2);
      ctx.fill();
      // Tail
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(380, 315);
      ctx.quadraticCurveTo(365, 300, 365, 290);
      ctx.stroke();

    } else if (scenario === 'fall_emergency') {
      // Fallen resident on porch floor
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(280, 320, 130, 40);
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(270, 335, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderVisionOverlays(w, h) {
    const { ctx } = this;
    if (!this.activeScenario || !this.activeScenario.objectsDetected) return;

    this.activeScenario.objectsDetected.forEach(obj => {
      const [x, y, bw, bh] = obj.bbox;

      // Scaled bounding box coordinates for our 720x420 canvas
      const sx = (x / 720) * w;
      const sy = (y / 480) * h;
      const sbw = (bw / 720) * w;
      const sbh = (bh / 480) * h;

      // Draw bounding box
      ctx.strokeStyle = obj.color || '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sbw, sbh);

      // Corner target brackets
      const bracketLen = 10;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(sx, sy + bracketLen); ctx.lineTo(sx, sy); ctx.lineTo(sx + bracketLen, sy);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(sx + sbw - bracketLen, sy); ctx.lineTo(sx + sbw, sy); ctx.lineTo(sx + sbw, sy + bracketLen);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(sx, sy + sbh - bracketLen); ctx.lineTo(sx, sy + sbh); ctx.lineTo(sx + bracketLen, sy + sbh);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(sx + sbw - bracketLen, sy + sbh); ctx.lineTo(sx + sbw, sy + sbh); ctx.lineTo(sx + sbw, sy + sbh - bracketLen);
      ctx.stroke();

      // Label Pill
      const labelText = `${obj.label} (${Math.round(obj.confidence * 100)}%)`;
      ctx.font = 'bold 11px Inter, sans-serif';
      const textWidth = ctx.measureText(labelText).width;

      ctx.fillStyle = obj.color || '#38bdf8';
      ctx.fillRect(sx, sy - 20, textWidth + 12, 18);

      ctx.fillStyle = '#000000';
      ctx.fillText(labelText, sx + 6, sy - 6);
    });
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.guardAgent = new GuardAgentUI();
});
