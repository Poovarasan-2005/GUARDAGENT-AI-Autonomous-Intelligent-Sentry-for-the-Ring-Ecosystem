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
    this.demoMode = false;
    this.devices = {};
    this.activeScenario = null;
    this.apiCalls = [];
    this.activeFilter = 'ALL';
    this.ws = null;
    this.animFrameId = null;
    this.pulseCounter = 0;

    this.initElements();
    this.checkAuth();
    this.initCanvas();
    this.initWebSocket();
    this.attachEventListeners();
    this.startRenderLoop();
  }

  initElements() {
    // Auth & Gate
    this.loginGateOverlay = document.getElementById('loginGateOverlay');
    this.loginForm = document.getElementById('loginForm');
    this.btnQuickJudgeLogin = document.getElementById('btnQuickJudgeLogin');
    this.btnLogout = document.getElementById('btnLogout');

    // Modals
    this.archModalBackdrop = document.getElementById('archModalBackdrop');
    this.btnOpenArchModal = document.getElementById('btnOpenArchModal');
    this.btnCloseArchModal = document.getElementById('btnCloseArchModal');

    this.incidentModalBackdrop = document.getElementById('incidentModalBackdrop');
    this.btnCloseIncidentModal = document.getElementById('btnCloseIncidentModal');
    this.btnDismissIncidentModal = document.getElementById('btnDismissIncidentModal');
    this.incModalSeverity = document.getElementById('incModalSeverity');
    this.incModalTime = document.getElementById('incModalTime');
    this.incModalZone = document.getElementById('incModalZone');
    this.incModalRef = document.getElementById('incModalRef');

    // Threat Elements
    this.elThreatVal = document.getElementById('overlayThreatVal');
    this.elThreatLevel = document.getElementById('overlayThreatLevel');
    this.elThreatBadge = document.getElementById('threatOverlayBadge');
    this.elThreatNumber = document.getElementById('threatNumber');
    this.elThreatStatusBadge = document.getElementById('threatStatusBadge');
    this.activeDecisionTag = document.getElementById('activeDecisionTag');
    this.canvasStageBadge = document.getElementById('canvasStageBadge');

    this.elBarVisual = document.getElementById('barVisual');
    this.elValVisual = document.getElementById('valVisualAnomaly');
    this.elBarDwell = document.getElementById('barDwell');
    this.elValDwell = document.getElementById('valDwellTime');
    this.elBarZone = document.getElementById('barZone');
    this.elValZone = document.getElementById('valZoneBreach');
    this.elBarBehavior = document.getElementById('barBehavior');
    this.elValBehavior = document.getElementById('valBehavior');

    // Devices Elements
    this.elLockText = document.getElementById('lockStateText');
    this.btnToggleLock = document.getElementById('btnToggleLock');
    this.elFloodlightText = document.getElementById('floodlightStateText');
    this.btnToggleFloodlight = document.getElementById('btnToggleFloodlight');
    this.elSirenText = document.getElementById('sirenStateText');
    this.btnToggleSiren = document.getElementById('btnToggleSiren');
    this.contactSensorText = document.getElementById('contactSensorText');
    this.btnToggleContact = document.getElementById('btnToggleContact');

    // Intercom & Feed
    this.elIntercomSpeaker = document.getElementById('intercomSpeaker');
    this.elIntercomText = document.getElementById('intercomSpeechText');
    this.elWaveform = document.getElementById('waveformAnim');
    this.elDecisionFeed = document.getElementById('decisionFeed');
    this.btnClearFeed = document.getElementById('btnClearFeed');

    // API Inspector
    this.elApiLogStream = document.getElementById('apiLogStream');
    this.elApiCallCount = document.getElementById('apiCallCount');
    this.elSirenStrobe = document.getElementById('sirenStrobeOverlay');
    this.elStreamTimestamp = document.getElementById('streamTimestamp');
    this.elCameraName = document.getElementById('currentCameraName');
    this.elModeSelect = document.getElementById('agentModeSelect');

    // Timeline Stepper
    this.timelineSteps = {
      detect: document.getElementById('stepDetect'),
      understand: document.getElementById('stepUnderstand'),
      decide: document.getElementById('stepDecide'),
      act: document.getElementById('stepAct'),
      verify: document.getElementById('stepVerify'),
      complete: document.getElementById('stepComplete')
    };
    this.timelineStatusTag = document.getElementById('timelineStatusTag');
    this.timelineStepDetail = document.getElementById('timelineStepDetail');

    // Controls
    this.btnToggleDemoMode = document.getElementById('btnToggleDemoMode');
    this.btnResetDemo = document.getElementById('btnResetDemo');
    this.btnFullscreen = document.getElementById('btnFullscreen');
    this.overrideStatusText = document.getElementById('overrideStatusText');
  }

  // =========================================================================
  // Authentication & Gate Logic
  // =========================================================================
  checkAuth() {
    const token = sessionStorage.getItem('guardagent_auth');
    if (token) {
      this.loginGateOverlay.classList.add('hidden');
    } else {
      this.loginGateOverlay.classList.remove('hidden');
    }
  }

  async performLogin(sentryId, accessKey) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentryId, accessKey })
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('guardagent_auth', data.token);
        this.loginGateOverlay.classList.add('hidden');
        this.addDecisionFeedItem({
          title: `Operator Authenticated: ${data.user.name}`,
          description: `Access granted (${data.user.role} - Clearance: ${data.user.clearanceLevel}). Sentry console unlocked.`,
          level: 'BENIGN'
        });
      } else {
        alert(data.message || 'Authentication failed.');
      }
    } catch (e) {
      // Offline fallback
      sessionStorage.setItem('guardagent_auth', 'demo_fallback_token');
      this.loginGateOverlay.classList.add('hidden');
    }
  }

  initCanvas() {
    this.canvas.width = 720;
    this.canvas.height = 420;
  }

  // =========================================================================
  // WebSocket Communication
  // =========================================================================
  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      document.getElementById('wsStatusText').innerText = 'RING MESH ONLINE';
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
          this.apiCalls = payload.apiLogs;
          this.renderApiLogs();
        }
        break;

      case 'INCIDENT_TRIGGERED':
        this.handleIncidentTriggered(payload);
        break;

      case 'ACTION_EXECUTED':
        this.handleActionExecuted(payload);
        break;

      case 'SECURITY_INCIDENT_LOGGED':
        this.showIncidentModal(payload);
        break;

      case 'DEVICE_UPDATED':
        this.fetchDevices();
        break;

      case 'DEMO_RESET':
        this.applyResetUI();
        break;

      case 'MANUAL_OVERRIDE_EXECUTED':
        this.overrideStatusText.innerText = `Status: ${payload.summary}`;
        this.overrideStatusText.classList.add('overridden');
        this.addDecisionFeedItem({
          title: `Human Override: ${payload.command}`,
          description: `${payload.summary} Executed by: ${payload.operator}.`,
          level: 'CAUTION'
        });
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
      if (dev.id === 'contact_sensor_front_gate') {
        const isClosed = dev.state === 'closed';
        this.contactSensorText.innerText = isClosed ? 'CLOSED (Secure)' : 'OPEN (Alert)';
        this.contactSensorText.style.color = isClosed ? 'var(--accent-emerald)' : 'var(--accent-amber)';
        this.btnToggleContact.innerText = isClosed ? 'Simulate Open' : 'Simulate Close';
      }
    });
  }

  // =========================================================================
  // Incident & Timeline Handling
  // =========================================================================
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

    // Decision Tag
    if (event.scenario === 'courier') {
      this.activeDecisionTag.innerText = 'DECISION: SAFE PARCEL DEPOSIT (ACCESS GRANTED)';
      this.activeDecisionTag.style.color = '#38bdf8';
      this.canvasStageBadge.innerText = 'COURIER DETECTED';
      this.canvasStageBadge.classList.remove('critical');
      this.setTimelineStep('verify', 'Courier placement verified in porch delivery box.');
    } else if (event.scenario === 'intruder') {
      this.activeDecisionTag.innerText = 'DECISION: ESCALATE → STAGE 3 (ACTIVE DETERRENCE)';
      this.activeDecisionTag.style.color = '#ef4444';
      this.canvasStageBadge.innerText = 'STAGE 3: ACTIVE DETERRENCE';
      this.canvasStageBadge.classList.add('critical');
      this.setTimelineStep('act', 'Graduated response Stage 3 active: 110dB Siren & spotlight strobe.');
    } else if (event.scenario === 'theft') {
      this.activeDecisionTag.innerText = 'DECISION: THREAT INTERCEPTION (THEFT ATTEMPT)';
      this.activeDecisionTag.style.color = '#ef4444';
      this.canvasStageBadge.innerText = 'THEFT THWARTED';
      this.canvasStageBadge.classList.add('critical');
    } else if (event.scenario === 'resident') {
      this.activeDecisionTag.innerText = 'DECISION: RESIDENT RECOGNIZED (UNLOCKED)';
      this.activeDecisionTag.style.color = '#34d399';
      this.canvasStageBadge.innerText = 'WELCOME HOME';
      this.canvasStageBadge.classList.remove('critical');
    } else {
      this.activeDecisionTag.innerText = `DECISION: ${level} CLASSIFICATION`;
      this.activeDecisionTag.style.color = color;
      this.canvasStageBadge.innerText = `MONITORING (${level})`;
      this.canvasStageBadge.classList.remove('critical');
    }

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

    // Camera Switch if relevant
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

  setTimelineStep(stepName, detailText) {
    const stepOrder = ['detect', 'understand', 'decide', 'act', 'verify', 'complete'];
    const targetIdx = stepOrder.indexOf(stepName);

    stepOrder.forEach((step, idx) => {
      const el = this.timelineSteps[step];
      if (idx < targetIdx) {
        el.className = 't-step completed';
      } else if (idx === targetIdx) {
        el.className = 't-step active';
      } else {
        el.className = 't-step';
      }
    });

    if (detailText) {
      this.timelineStepDetail.innerText = detailText;
      this.timelineStatusTag.innerText = stepName.toUpperCase();
    }
  }

  handleActionExecuted(payload) {
    const { action, details } = payload;
    let desc = '';
    let isDanger = false;

    if (action === 'VOICE_INTERCOM_GREET') {
      desc = `Dispatched speech to Ring Doorbell Speaker: "${details.message}"`;
      this.triggerVoiceAudio(details.message);
    } else if (action === 'UNLOCK_SMART_DEADBOLT') {
      desc = `Unlocked Ring Smart Deadbolt (Target: Porch Parcel Box, Duration: ${details.temporaryDurationSeconds || 30}s). Main house secured.`;
      this.fetchDevices();
    } else if (action === 'TRIGGER_ALARM_SIREN') {
      desc = `Triggered 110dB Ring Alarm Siren on Floodlight Cam.`;
      isDanger = true;
      this.fetchDevices();
    } else if (action === 'FLOODLIGHT_ILLUMINATE') {
      desc = `Activated Floodlight Cam LEDs at ${details.intensity}% intensity.`;
      this.fetchDevices();
    } else if (action === 'STAGE_1_ALERT') {
      desc = details.title;
    } else if (action === 'STAGE_2_VOICE') {
      desc = details.title;
    } else if (action === 'STAGE_3_DETERRENCE') {
      desc = details.title;
      isDanger = true;
    } else {
      desc = `Action: ${action} executed successfully.`;
    }

    this.addDecisionFeedItem({
      title: `Autonomous Actuation: ${action}`,
      description: desc,
      level: isDanger ? 'CRITICAL' : 'BENIGN'
    });

    this.refreshApiLogs();
  }

  showIncidentModal(incident) {
    this.incModalSeverity.innerText = `${incident.severity} (${incident.threatScore}%)`;
    this.incModalTime.innerText = incident.time;
    this.incModalZone.innerText = incident.zone;
    this.incModalRef.innerText = incident.id.toUpperCase();
    this.incidentModalBackdrop.classList.add('active');
  }

  triggerVoiceAudio(message) {
    this.elIntercomSpeaker.innerText = 'Ring Doorbell Two-Way Intercom (Sentry Speaking)';
    this.elIntercomText.innerText = `"${message}"`;
    this.elWaveform.classList.add('active');

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
    while (this.elDecisionFeed.children.length > 35) {
      this.elDecisionFeed.removeChild(this.elDecisionFeed.lastChild);
    }
  }

  async refreshApiLogs() {
    try {
      const res = await fetch('/api/ring/api-logs');
      const data = await res.json();
      if (data.logs) {
        this.apiCalls = data.logs;
        this.renderApiLogs();
      }
    } catch (e) {}
  }

  renderApiLogs() {
    const stream = this.elApiLogStream;
    stream.innerHTML = '';

    const filtered = this.apiCalls.filter(call => {
      if (this.activeFilter === 'ALL') return true;
      if (this.activeFilter === 'EVENTS') return call.endpoint.includes('webhook') || call.method === 'GET';
      if (this.activeFilter === 'COMMANDS') return call.method === 'POST' || call.method === 'PUT';
      return true;
    });

    this.elApiCallCount.innerText = `${filtered.length} Calls`;

    if (filtered.length === 0) {
      stream.innerHTML = '<div class="log-placeholder">No matching Ring API calls found.</div>';
      return;
    }

    filtered.slice(0, 18).forEach(call => {
      const entry = document.createElement('div');
      entry.className = 'api-log-entry';
      const methodClass = (call.method || 'GET').toLowerCase();
      const isIncoming = call.endpoint.includes('webhook');

      entry.innerHTML = `
        <span class="api-dir">${isIncoming ? 'IN' : 'OUT'}</span>
        <span class="api-method ${methodClass}">${call.method}</span>
        <span class="api-endpoint">${call.endpoint}</span>
        <span class="api-status">${call.status || 200} OK</span>
      `;
      stream.appendChild(entry);
    });
  }

  switchCamera(camType) {
    this.currentCam = camType;
    document.getElementById('btnCamDoorbell').classList.toggle('active', camType === 'doorbell');
    document.getElementById('btnCamFloodlight').classList.toggle('active', camType === 'floodlight');
    this.elCameraName.innerText = camType === 'doorbell' ? 'Front Door Pro 2' : 'Driveway Floodlight Cam Wired Pro';
  }

  applyResetUI() {
    this.activeScenario = null;
    this.nightVision = false;
    document.getElementById('btnNightVision').classList.remove('active');
    this.switchCamera('doorbell');
    this.elSirenStrobe.classList.remove('active');

    this.elThreatVal.innerText = '0%';
    this.elThreatLevel.innerText = 'BENIGN';
    this.elThreatNumber.innerText = '0%';
    this.elThreatStatusBadge.innerText = 'NORMAL';
    this.activeDecisionTag.innerText = 'DECISION: STANDBY MONITORING';

    this.elThreatNumber.style.color = '#38bdf8';
    this.elThreatVal.style.color = '#38bdf8';
    this.elThreatStatusBadge.style.color = '#10b981';
    this.activeDecisionTag.style.color = '#34d399';

    this.canvasStageBadge.innerText = 'STANDBY SENTRY';
    this.canvasStageBadge.classList.remove('critical');

    this.elBarVisual.style.width = '0%';
    this.elValVisual.innerText = '0%';
    this.elBarDwell.style.width = '0%';
    this.elValDwell.innerText = '0s';
    this.elBarZone.style.width = '0%';
    this.elValZone.innerText = 'Clear';
    this.elBarBehavior.style.width = '0%';
    this.elValBehavior.innerText = '0%';

    this.overrideStatusText.innerText = 'Status: Assistive Autonomous Mode Active (Manual Authority Available)';
    this.overrideStatusText.classList.remove('overridden');

    this.setTimelineStep('detect', 'System reset to pristine state. Awaiting next security scenario trigger.');
    this.fetchDevices();

    this.addDecisionFeedItem({
      title: 'Demo Environment Reset',
      description: 'All virtual Ring devices restored to locked/idle standby state. Telemetry cleared.',
      level: 'BENIGN'
    });
  }

  // =========================================================================
  // Event Listeners
  // =========================================================================
  attachEventListeners() {
    // Auth Form
    this.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('sentryIdInput').value;
      const key = document.getElementById('accessKeyInput').value;
      this.performLogin(id, key);
    });

    this.btnQuickJudgeLogin.addEventListener('click', () => {
      this.performLogin('judge@amazon-dev.com', 'hackathon2026');
    });

    this.btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem('guardagent_auth');
      this.loginGateOverlay.classList.remove('hidden');
    });

    // Architecture Modal
    this.btnOpenArchModal.addEventListener('click', () => {
      this.archModalBackdrop.classList.add('active');
    });
    this.btnCloseArchModal.addEventListener('click', () => {
      this.archModalBackdrop.classList.remove('active');
    });
    this.archModalBackdrop.addEventListener('click', (e) => {
      if (e.target === this.archModalBackdrop) this.archModalBackdrop.classList.remove('active');
    });

    // Incident Modal
    this.btnCloseIncidentModal.addEventListener('click', () => {
      this.incidentModalBackdrop.classList.remove('active');
    });
    this.btnDismissIncidentModal.addEventListener('click', () => {
      this.incidentModalBackdrop.classList.remove('active');
    });

    // Demo Mode & Reset
    this.btnToggleDemoMode.addEventListener('click', () => {
      this.demoMode = !this.demoMode;
      document.body.classList.toggle('demo-mode', this.demoMode);
      this.btnToggleDemoMode.classList.toggle('active', this.demoMode);
    });

    this.btnResetDemo.addEventListener('click', async () => {
      await fetch('/api/demo/reset', { method: 'POST' });
    });

    this.btnFullscreen.addEventListener('click', () => {
      const wrapper = document.getElementById('canvasWrapper');
      if (!document.fullscreenElement) {
        wrapper.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Manual Human Overrides
    document.querySelectorAll('.override-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.getAttribute('data-action');
        await fetch('/api/agent/override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: action })
        });
      });
    });

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

    // API Inspector Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.getAttribute('data-filter');
        this.renderApiLogs();
      });
    });

    // Clear feed
    this.btnClearFeed.addEventListener('click', () => {
      this.elDecisionFeed.innerHTML = '<div class="feed-item"><div class="feed-time">NOW</div><div class="feed-content"><strong>Log Cleared</strong><p>Decision timeline reset by user.</p></div></div>';
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

    this.btnToggleContact.addEventListener('click', () => {
      const contactDev = this.devices['contact_sensor_front_gate'];
      const isClosed = contactDev ? contactDev.state === 'closed' : true;
      contactDev.state = isClosed ? 'open' : 'closed';
      this.updateDevicesList([contactDev]);
      this.addDecisionFeedItem({
        title: `Gate Sensor State: ${contactDev.state.toUpperCase()}`,
        description: `Perimeter gate contact sensor transitioned to ${contactDev.state}.`,
        level: isClosed ? 'CAUTION' : 'BENIGN'
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

    // Front Door Frame (Permanent residence entrance)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(260, 40, 200, 320);

    // Front Door Panel (Main Residence)
    ctx.fillStyle = this.nightVision ? '#13281b' : '#0369a1';
    ctx.fillRect(270, 50, 180, 310);

    // Door Glass window & brass handle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(310, 80, 100, 90);

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(430, 210, 6, 0, Math.PI * 2);
    ctx.fill();

    // Porch Parcel Lockbox (The only lock actuated during courier delivery)
    const isBoxUnlocked = this.devices['smart_deadbolt_front'] && !this.devices['smart_deadbolt_front'].locked;
    ctx.fillStyle = isBoxUnlocked ? '#0284c7' : '#475569';
    ctx.fillRect(520, 250, 95, 85);
    ctx.strokeStyle = isBoxUnlocked ? '#00f2fe' : '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(520, 250, 95, 85);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(isBoxUnlocked ? 'BOX: UNLOCKED' : 'RING LOCKBOX', 526, 280);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('PARCEL ONLY', 526, 295);

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
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.arc(360, 120, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(344, 102, 32, 10);
      // Amazon box
      ctx.fillStyle = '#d97706';
      ctx.fillRect(340, 190, 50, 40);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(365, 208, 12, 0.2, Math.PI - 0.2);
      ctx.stroke();

    } else if (scenario === 'intruder') {
      // Draw Night Intruder
      ctx.fillStyle = '#0f172a'; // Dark hoodie
      ctx.fillRect(340, 150, 55, 140);
      ctx.fillStyle = '#334155'; // Mask
      ctx.beginPath();
      ctx.arc(367, 130, 17, 0, Math.PI * 2);
      ctx.fill();
      // Crowbar
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(335, 230);
      ctx.lineTo(320, 280);
      ctx.stroke();

    } else if (scenario === 'theft') {
      // Porch Pirate lunging for lockbox
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(440, 180, 50, 120);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(465, 160, 16, 0, Math.PI * 2);
      ctx.fill();
      // Hand reaching towards lockbox
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(465, 220);
      ctx.lineTo(518, 260);
      ctx.stroke();

    } else if (scenario === 'unknown_visitor') {
      // Solicitor with clipboard
      ctx.fillStyle = '#475569';
      ctx.fillRect(340, 140, 50, 140);
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(365, 120, 16, 0, Math.PI * 2);
      ctx.fill();
      // Clipboard
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(375, 190, 25, 35);

    } else if (scenario === 'resident') {
      // Resident Sarah
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(340, 140, 50, 140);
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(365, 120, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(385, 210, 8, 8);

    } else if (scenario === 'animal') {
      // Neighborhood cat
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(380, 310, 45, 24);
      ctx.beginPath();
      ctx.arc(425, 316, 12, 0, Math.PI * 2);
      ctx.fill();
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
      const sx = (x / 720) * w;
      const sy = (y / 480) * h;
      const sbw = (bw / 720) * w;
      const sbh = (bh / 480) * h;

      ctx.strokeStyle = obj.color || '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sbw, sbh);

      const bracketLen = 10;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(sx, sy + bracketLen); ctx.lineTo(sx, sy); ctx.lineTo(sx + bracketLen, sy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + sbw - bracketLen, sy); ctx.lineTo(sx + sbw, sy); ctx.lineTo(sx + sbw, sy + bracketLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx, sy + sbh - bracketLen); ctx.lineTo(sx, sy + sbh); ctx.lineTo(sx + bracketLen, sy + sbh);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + sbw - bracketLen, sy + sbh); ctx.lineTo(sx + sbw, sy + sbh); ctx.lineTo(sx + sbw, sy + sbh - bracketLen);
      ctx.stroke();

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
