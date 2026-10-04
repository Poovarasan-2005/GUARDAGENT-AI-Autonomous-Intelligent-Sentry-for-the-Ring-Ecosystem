/**
 * GuardAgent AI - Ring Device Virtual Simulator
 * High-fidelity hardware simulator implementing official Ring Webhook and REST API schemas.
 * Amazon Developer Hackathon 2026 - Ring Track
 */

import { DeviceTypes, EventTypes, VisitorTypes } from './ringTypes.js';

export class RingSimulator {
  constructor() {
    this.devices = {
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
        name: 'Driveway Floodlight Cam',
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
        name: 'Interior Chime Pro',
        kind: DeviceTypes.CHIME,
        firmware: '5.2.1',
        online: true,
        volume: 85,
        currentlyPlaying: null
      }
    };

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
      }, 4000);
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
        deviceId: 'floodlight_driveway',
        eventType: EventTypes.MOTION,
        visitorType: VisitorTypes.SUSPICIOUS,
        objectsDetected: [
          { label: 'Unknown Subject (Face Covered)', confidence: 0.94, bbox: [210, 110, 260, 490], color: '#ef4444' },
          { label: 'Crowbar / Tool', confidence: 0.88, bbox: [320, 290, 80, 190], color: '#dc2626' }
        ],
        visualAnomaly: 0.92,
        dwellTimeSeconds: 48,
        perimeterZoneBreach: true,
        facialOcclusion: true,
        behaviorVector: 0.89,
        ambientLighting: 'NIGHT_LOW_LIGHT',
        visitorSpeech: null
      },
      resident: {
        scenario: 'resident',
        title: 'Authorized Resident Return',
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
