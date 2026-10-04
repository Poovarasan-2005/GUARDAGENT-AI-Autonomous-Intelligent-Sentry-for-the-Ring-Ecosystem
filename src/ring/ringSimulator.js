/**
 * GuardAgent AI - Ring Device Virtual Simulator
 * High-fidelity hardware simulator implementing official Ring Webhook and REST API schemas.
 * Amazon Developer Hackathon 2026 - Ring Track
 */

import { DeviceTypes, EventTypes, VisitorTypes } from './ringTypes.js';

export class RingSimulator {
  constructor() {
    this.initialState = {
      'doorbell_front': {
        id: 'doorbell_front',
        name: 'Front Door Pro 2',
        kind: DeviceTypes.DOORBELL,
        firmware: '12.4.98',
        battery: 94,
        online: true,
        motionDetectionEnabled: true,
        twoWayTalkActive: false,
        lastEvent: null
      },
      'floodlight_driveway': {
        id: 'floodlight_driveway',
        name: 'Driveway Floodlight Cam Wired Pro',
        kind: DeviceTypes.FLOODLIGHT_CAM,
        firmware: '9.8.12',
        online: true,
        lightsOn: false,
        lightIntensity: 0,
        sirenActive: false,
        lastEvent: null
      },
      'smart_deadbolt_front': {
        id: 'smart_deadbolt_front',
        name: 'Front Porch Smart Deadbolt',
        kind: DeviceTypes.SMART_LOCK,
        firmware: '3.1.0',
        battery: 89,
        online: true,
        locked: true,
        autoRelockTimer: 15,
        lastActuation: null
      },
      'chime_hallway': {
        id: 'chime_hallway',
        name: 'Interior Chime Pro v2',
        kind: DeviceTypes.CHIME,
        firmware: '5.2.1',
        online: true,
        volume: 85,
        currentlyPlaying: null
      },
      'contact_sensor_front_gate': {
        id: 'contact_sensor_front_gate',
        name: 'Perimeter Gate Contact Sensor',
        kind: DeviceTypes.CONTACT_SENSOR,
        firmware: '2.0.4',
        battery: 98,
        online: true,
        tamper: 'ok',
        state: 'closed',
        lastEvent: null
      }
    };

    this.devices = JSON.parse(JSON.stringify(this.initialState));
    this.listeners = [];
    this.activeScenario = null;
  }

  onEvent(callback) {
    this.listeners.push(callback);
  }

  emit(event) {
    this.listeners.forEach(cb => cb(event));
  }

  getDevices() {
    return Object.values(this.devices);
  }

  getDevice(id) {
    return this.devices[id] || null;
  }

  updateDevice(id, patch) {
    if (!this.devices[id]) return null;
    this.devices[id] = { ...this.devices[id], ...patch };
    this.emit({
      type: EventTypes.DEVICE_STATE_CHANGE,
      deviceId: id,
      state: this.devices[id],
      timestamp: new Date().toISOString()
    });
    return this.devices[id];
  }

  emitIntercomAudio(deviceId, message) {
    const dev = this.devices[deviceId];
    if (dev) {
      dev.twoWayTalkActive = true;
      setTimeout(() => {
        if (this.devices[deviceId]) this.devices[deviceId].twoWayTalkActive = false;
      }, 4500);
    }
    const event = {
      type: EventTypes.TWO_WAY_AUDIO_START,
      deviceId,
      message,
      speaker: 'GuardAgent_Sentry',
      timestamp: new Date().toISOString()
    };
    this.emit(event);
    return event;
  }

  reset() {
    this.devices = JSON.parse(JSON.stringify(this.initialState));
    this.activeScenario = null;
    const resetEvent = {
      type: 'SIMULATOR_RESET',
      timestamp: new Date().toISOString(),
      message: 'Ring Virtual Device Mesh reset to pristine standby state.'
    };
    this.emit(resetEvent);
    return { success: true, devices: this.getDevices() };
  }

  /**
   * Simulate a Ring Motion or Ding Webhook event
   */
  triggerEvent(scenarioName, customData = {}) {
    const scenarios = {
      courier: {
        scenario: 'courier',
        title: 'Amazon Prime Courier Delivery',
        deviceId: 'doorbell_front',
        eventType: EventTypes.DING,
        visitorType: VisitorTypes.COURIER,
        objectsDetected: [
          { label: 'Delivery Courier', confidence: 0.96, bbox: [160, 90, 320, 480], color: '#38bdf8' },
          { label: 'Amazon Parcel', confidence: 0.98, bbox: [220, 310, 160, 140], color: '#f59e0b' }
        ],
        visualAnomaly: 0.05,
        dwellTimeSeconds: 12,
        perimeterZoneBreach: false,
        facialOcclusion: false,
        behaviorVector: 0.1,
        ambientLighting: 'DAYLIGHT',
        visitorSpeech: 'Delivery for resident! Need safe place to leave box.'
      },
      intruder: {
        scenario: 'intruder',
        title: 'Late-Night Perimeter Breach / Lurker',
        timeOfDay: '02:00 AM',
        deviceId: 'floodlight_driveway',
        eventType: EventTypes.MOTION,
        visitorType: VisitorTypes.SUSPICIOUS,
        objectsDetected: [
          { label: 'Unknown Subject (Face Occluded)', confidence: 0.94, bbox: [210, 110, 260, 490], color: '#ef4444' },
          { label: 'Crowbar / Burglary Tool', confidence: 0.88, bbox: [320, 290, 80, 190], color: '#dc2626' }
        ],
        visualAnomaly: 0.85,
        dwellTimeSeconds: 45,
        perimeterZoneBreach: true,
        facialOcclusion: true,
        behaviorVector: 0.717,
        ambientLighting: 'NIGHT_LOW_LIGHT',
        visitorSpeech: null
      },
      theft: {
        scenario: 'theft',
        title: 'Package Theft Attempt (Porch Pirate)',
        timeOfDay: '03:15 PM',
        deviceId: 'doorbell_front',
        eventType: EventTypes.MOTION,
        visitorType: VisitorTypes.PORCH_PIRATE,
        objectsDetected: [
          { label: 'Suspicious Individual', confidence: 0.95, bbox: [200, 100, 270, 480], color: '#ef4444' },
          { label: 'Targeted Parcel Box', confidence: 0.92, bbox: [520, 250, 90, 80], color: '#f59e0b' }
        ],
        visualAnomaly: 0.88,
        dwellTimeSeconds: 8,
        perimeterZoneBreach: true,
        facialOcclusion: true,
        behaviorVector: 0.85,
        ambientLighting: 'DAYLIGHT',
        visitorSpeech: null
      },
      unknown_visitor: {
        scenario: 'unknown_visitor',
        title: 'Unfamiliar Daytime Visitor / Solicitor',
        timeOfDay: '11:45 AM',
        deviceId: 'doorbell_front',
        eventType: EventTypes.DING,
        visitorType: VisitorTypes.STRANGER,
        objectsDetected: [
          { label: 'Unfamiliar Visitor', confidence: 0.91, bbox: [190, 90, 280, 480], color: '#eab308' },
          { label: 'Clipboard', confidence: 0.84, bbox: [270, 260, 80, 110], color: '#cbd5e1' }
        ],
        visualAnomaly: 0.22,
        dwellTimeSeconds: 18,
        perimeterZoneBreach: false,
        facialOcclusion: false,
        behaviorVector: 0.25,
        ambientLighting: 'DAYLIGHT',
        visitorSpeech: 'Hello? Anyone home? Just inquiring about home roofing.'
      },
      resident: {
        scenario: 'resident',
        title: 'Authorized Resident Return',
        timeOfDay: '05:30 PM',
        deviceId: 'doorbell_front',
        eventType: EventTypes.MOTION,
        visitorType: VisitorTypes.RESIDENT,
        objectsDetected: [
          { label: 'Resident (Sarah)', confidence: 0.99, bbox: [180, 80, 280, 490], color: '#10b981' },
          { label: 'House Keys', confidence: 0.91, bbox: [260, 280, 70, 80], color: '#34d399' }
        ],
        visualAnomaly: 0.02,
        dwellTimeSeconds: 6,
        perimeterZoneBreach: false,
        facialOcclusion: false,
        behaviorVector: 0.05,
        ambientLighting: 'AFTERNOON',
        visitorSpeech: 'Hey GuardAgent, unlocked already? Thanks!'
      },
      animal: {
        scenario: 'animal',
        title: 'Neighborhood Cat (False Alarm Mitigation)',
        timeOfDay: '07:15 PM',
        deviceId: 'floodlight_driveway',
        eventType: EventTypes.MOTION,
        visitorType: VisitorTypes.ANIMAL,
        objectsDetected: [
          { label: 'Domestic Cat', confidence: 0.97, bbox: [320, 420, 140, 90], color: '#a78bfa' }
        ],
        visualAnomaly: 0.08,
        dwellTimeSeconds: 4,
        perimeterZoneBreach: false,
        facialOcclusion: false,
        behaviorVector: 0.02,
        ambientLighting: 'DUSK',
        visitorSpeech: null
      },
      fall_emergency: {
        scenario: 'fall_emergency',
        title: 'Caretaker Emergency: Fall Detected on Porch',
        timeOfDay: '09:20 AM',
        deviceId: 'doorbell_front',
        eventType: EventTypes.MOTION,
        visitorType: VisitorTypes.RESIDENT,
        objectsDetected: [
          { label: 'Elderly Resident (Down)', confidence: 0.93, bbox: [120, 360, 390, 180], color: '#f97316' }
        ],
        visualAnomaly: 0.85,
        dwellTimeSeconds: 75,
        perimeterZoneBreach: false,
        facialOcclusion: false,
        behaviorVector: 0.95,
        ambientLighting: 'MORNING',
        visitorSpeech: 'Help... I dropped my groceries and fell.'
      }
    };

    const template = scenarios[scenarioName] || scenarios.courier;
    const eventPayload = {
      id: 'ring_evt_' + Date.now(),
      timestamp: new Date().toISOString(),
      ...template,
      ...customData
    };

    this.activeScenario = eventPayload;
    this.emit(eventPayload);
    return eventPayload;
  }
}
