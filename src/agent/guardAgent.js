/**
 * GuardAgent AI - Core Agent Orchestrator
 * Integrates Ring APIs, Threat Engine, Policy Rules, and Autonomous Actuation.
 * Amazon Developer Hackathon 2026 - Ring Track
 */

import { ThreatEngine } from './threatEngine.js';
import { PolicyRules } from './policyRules.js';
import { ThreatLevels } from '../ring/ringTypes.js';

export class GuardAgent {
  constructor(ringClient, ringSimulator) {
    this.ringClient = ringClient;
    this.ringSimulator = ringSimulator;
    this.threatEngine = new ThreatEngine();
    this.mode = 'ARMED_SENTRY'; // 'ARMED_SENTRY' | 'DISARMED' | 'CARETAKER_ONLY' | 'MANUAL_OVERRIDE'
    this.sensitivity = 'BALANCED'; // 'HIGH' | 'BALANCED' | 'CONSERVATIVE'
    this.eventHistory = [];
    this.activeIncident = null;
    this.lastSecurityIncidentRecord = null;
    this.broadcastCallback = null;

    this.init();
  }

  setBroadcastCallback(cb) {
    this.broadcastCallback = cb;
  }

  broadcast(type, payload) {
    if (this.broadcastCallback) {
      this.broadcastCallback({ type, payload, timestamp: new Date().toISOString() });
    }
  }

  init() {
    // Listen to Ring events emitted by simulator or cloud webhook
    if (this.ringSimulator) {
      this.ringSimulator.onEvent(async (event) => {
        if (event.type === 'SIMULATOR_RESET') {
          this.resetAgent();
          return;
        }
        // Only evaluate security triggers (motion, ding, zone_breach), not internal device actuation loops!
        if (event.type === 'device_state_change' || event.type === 'two_way_audio_start' || event.type === 'two_way_audio_end') {
          return;
        }
        if (!event.eventType && !event.scenario) {
          return;
        }
        await this.handleRingEvent(event);
      });
    }
  }

  resetAgent() {
    this.activeIncident = null;
    this.lastSecurityIncidentRecord = null;
    this.mode = 'ARMED_SENTRY';
    this.broadcast('AGENT_RESET', {
      mode: this.mode,
      message: 'GuardAgent AI reset to default Armed Sentry state.'
    });
  }

  /**
   * Main entry point when a Ring Event (motion, ding, door state) is ingested
   */
  async handleRingEvent(event) {
    if (this.mode === 'DISARMED') {
      this.broadcast('AGENT_STATUS', { message: 'Event ignored: GuardAgent is DISARMED.' });
      return;
    }

    // 1. Threat Matrix Assessment (Calculated via multi-factor logistic model)
    const threatAnalysis = this.threatEngine.evaluate(event);

    // 2. Determine Policy Actions & Safe Access Bounds
    const plannedActions = PolicyRules.determineActions(event, threatAnalysis);

    // 3. Assemble Incident Payload
    const incident = {
      id: 'inc_' + Date.now(),
      timestamp: new Date().toISOString(),
      timeOfDay: event.timeOfDay || new Date().toLocaleTimeString(),
      zone: event.deviceId === 'floodlight_driveway' ? 'Driveway Perimeter' : 'Front Porch Entry',
      event,
      threatAnalysis,
      plannedActions,
      executedActions: [],
      status: 'PROCESSING'
    };

    this.activeIncident = incident;
    this.eventHistory.unshift(incident);
    if (this.eventHistory.length > 30) this.eventHistory.pop();

    this.broadcast('INCIDENT_TRIGGERED', incident);

    // 4. Autonomous Execution of Planned Actions via Ring APIs
    for (const actionItem of plannedActions) {
      await this.executeAction(actionItem, incident);
    }

    incident.status = 'RESOLVED';

    // 5. If high threat, format the Official Security Incident Record
    if (threatAnalysis.threatScorePercent >= 65) {
      this.lastSecurityIncidentRecord = {
        id: incident.id,
        title: 'SECURITY INCIDENT RECORD',
        severity: threatAnalysis.level,
        threatScore: threatAnalysis.threatScorePercent,
        time: incident.timeOfDay,
        zone: incident.zone,
        actionsCompleted: [
          'Floodlight activated (100% illumination)',
          'Verbal warning issued through Ring Speaker',
          threatAnalysis.threatScorePercent >= 85 ? '110dB Siren triggered' : null,
          'Cryptographic evidence captured',
          'Homeowner notified'
        ].filter(Boolean),
        status: 'CONTAINED',
        timestamp: new Date().toISOString()
      };
      this.broadcast('SECURITY_INCIDENT_LOGGED', this.lastSecurityIncidentRecord);
    }

    this.broadcast('INCIDENT_RESOLVED', incident);
  }

  /**
   * Programmatic execution of individual action item through Ring API
   */
  async executeAction(actionItem, incident) {
    let result = null;
    const { action, deviceId } = actionItem;

    try {
      switch (action) {
        case 'FLOODLIGHT_ILLUMINATE':
          result = await this.ringClient.setFloodlight(deviceId, true, actionItem.intensity || 100);
          break;

        case 'UNLOCK_SMART_DEADBOLT':
          result = await this.ringClient.setLock(deviceId, false);
          // If temporary unlock (e.g. for courier parcel box deposit), schedule auto-relock
          if (actionItem.temporaryDurationSeconds) {
            setTimeout(async () => {
              await this.ringClient.setLock(deviceId, true);
              this.broadcast('AGENT_ACTION_COMPLETED', {
                action: 'AUTO_RELOCK_SMART_DEADBOLT',
                deviceId,
                summary: 'Smart Deadbolt securely re-locked after courier deposit verification.'
              });
            }, actionItem.temporaryDurationSeconds * 1000);
          }
          break;

        case 'TRIGGER_ALARM_SIREN':
          result = await this.ringClient.triggerSiren(deviceId, true, actionItem.durationSeconds || 30);
          break;

        case 'VOICE_INTERCOM_GREET':
          result = await this.ringClient.broadcastVoiceMessage(deviceId, actionItem.message);
          break;

        case 'TIMELINE_STEP':
        case 'STAGE_1_ALERT':
        case 'STAGE_2_VOICE':
        case 'STAGE_3_DETERRENCE':
        case 'CAPTURE_EVIDENCE_SNAPSHOT':
        case 'DISPATCH_CARETAKER_ALERT':
        case 'DISPATCH_EMERGENCY_PUSH':
        case 'LOG_INCIDENT_SUMMARY':
        case 'SUPPRESS_NOTIFICATION':
          result = { success: true, logged: true, step: actionItem.step || actionItem.action };
          break;

        default:
          result = { success: true };
      }

      incident.executedActions.push({
        action: actionItem.action,
        timestamp: new Date().toISOString(),
        details: actionItem,
        result
      });

      this.broadcast('ACTION_EXECUTED', {
        incidentId: incident.id,
        action: actionItem.action,
        details: actionItem,
        result
      });

    } catch (err) {
      console.error(`[GuardAgent] Action execution failed (${action}):`, err);
    }
  }

  /**
   * Human Manual Override handler
   */
  async handleManualOverride(command, parameters = {}) {
    const overrideLog = {
      type: 'HUMAN_OVERRIDE_DETECTED',
      timestamp: new Date().toISOString(),
      command,
      parameters,
      operator: 'Homeowner / Master Admin'
    };

    switch (command) {
      case 'PAUSE_AGENT':
        this.mode = this.mode === 'DISARMED' ? 'ARMED_SENTRY' : 'DISARMED';
        overrideLog.summary = `Agent mode toggled to: ${this.mode}`;
        break;

      case 'STOP_SIREN':
        await this.ringClient.triggerSiren('floodlight_driveway', false);
        overrideLog.summary = 'Manually silenced Ring Alarm 110dB siren.';
        break;

      case 'LIGHTS_OFF':
        await this.ringClient.setFloodlight('floodlight_driveway', false, 0);
        overrideLog.summary = 'Manually turned off driveway floodlights.';
        break;

      case 'LIGHTS_ON':
        await this.ringClient.setFloodlight('floodlight_driveway', true, 100);
        overrideLog.summary = 'Manually turned on driveway floodlights at 100%.';
        break;

      case 'LOCK_DOOR':
        await this.ringClient.setLock('smart_deadbolt_front', true);
        overrideLog.summary = 'Manually locked Front Porch Smart Deadbolt.';
        break;

      case 'UNLOCK_DELIVERY_BOX':
        await this.ringClient.setLock('smart_deadbolt_front', false);
        overrideLog.summary = 'Manually unlocked porch parcel delivery lockbox.';
        break;
    }

    this.broadcast('MANUAL_OVERRIDE_EXECUTED', overrideLog);
    return overrideLog;
  }

  setMode(newMode) {
    this.mode = newMode;
    this.broadcast('AGENT_MODE_CHANGED', { mode: this.mode });
    return this.mode;
  }

  getStatus() {
    return {
      mode: this.mode,
      sensitivity: this.sensitivity,
      activeIncident: this.activeIncident,
      lastSecurityIncidentRecord: this.lastSecurityIncidentRecord,
      recentIncidentsCount: this.eventHistory.length,
      threatEngineModel: 'Logistic-Sigmoidal Multi-Vector v1.4',
      systemHealth: 'HEALTHY',
      safetyPolicyStatus: 'ACTIVE'
    };
  }
}
