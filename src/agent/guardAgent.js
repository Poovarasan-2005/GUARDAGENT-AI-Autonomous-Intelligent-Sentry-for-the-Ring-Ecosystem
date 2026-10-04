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
    this.mode = 'ARMED_SENTRY'; // 'ARMED_SENTRY' | 'DISARMED' | 'CARETAKER_ONLY'
    this.sensitivity = 'BALANCED'; // 'HIGH' | 'BALANCED' | 'CONSERVATIVE'
    this.eventHistory = [];
    this.activeIncident = null;
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
        await this.handleRingEvent(event);
      });
    }
  }

  /**
   * Main entry point when a Ring Event (motion, ding, door state) is ingested
   */
  async handleRingEvent(event) {
    if (this.mode === 'DISARMED') {
      this.broadcast('AGENT_STATUS', { message: 'Event ignored: GuardAgent is DISARMED.' });
      return;
    }

    // 1. Threat Matrix Assessment
    const threatAnalysis = this.threatEngine.evaluate(event);

    // 2. Determine Policy Actions
    const plannedActions = PolicyRules.determineActions(event, threatAnalysis);

    // 3. Assemble Incident Payload
    const incident = {
      id: 'inc_' + Date.now(),
      timestamp: new Date().toISOString(),
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
          // If temporary unlock (e.g. for courier drop-off), schedule auto-relock
          if (actionItem.temporaryDurationSeconds) {
            setTimeout(async () => {
              await this.ringClient.setLock(deviceId, true);
              this.broadcast('AGENT_ACTION_COMPLETED', {
                action: 'AUTO_RELOCK_SMART_DEADBOLT',
                deviceId,
                summary: 'Smart Deadbolt securely re-locked after courier deposit.'
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

        case 'DISPATCH_CARETAKER_ALERT':
        case 'DISPATCH_EMERGENCY_PUSH':
        case 'LOG_INCIDENT_SUMMARY':
        case 'SUPPRESS_NOTIFICATION':
          result = { success: true, logged: true };
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
      recentIncidentsCount: this.eventHistory.length,
      threatEngineModel: 'Logistic-Sigmoidal Multi-Vector v1.4',
      systemHealth: 'HEALTHY'
    };
  }
}
