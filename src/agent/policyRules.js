/**
 * GuardAgent AI - Policy Rules & Decision Matrix
 * Deterministic safety constraints and autonomous actuation policies.
 * Amazon Developer Hackathon 2026 - Ring Track
 */

import { ThreatLevels, VisitorTypes } from '../ring/ringTypes.js';

export const PolicyRules = {
  /**
   * Evaluates event and returns the recommended autonomous actions
   */
  determineActions(event, threatAnalysis) {
    const actions = [];
    const { threatScorePercent, level } = threatAnalysis;
    const { visitorType, objectsDetected = [] } = event;

    // RULE 1: Courier Safe-Deposit Access Control
    if (visitorType === VisitorTypes.COURIER) {
      actions.push({
        action: 'VOICE_INTERCOM_GREET',
        deviceId: 'doorbell_front',
        message: 'Hello! Thank you for the delivery. The porch parcel box has been temporarily unlocked for you. Please place the package inside and close the lid.',
        priority: 'NORMAL'
      });
      actions.push({
        action: 'UNLOCK_SMART_DEADBOLT',
        deviceId: 'smart_deadbolt_front',
        temporaryDurationSeconds: 15,
        target: 'porch_parcel_box',
        priority: 'HIGH'
      });
      actions.push({
        action: 'LOG_INCIDENT_SUMMARY',
        summary: 'Amazon delivery verified. Safe parcel drop-off initiated; smart lock relocking in 15 seconds.'
      });
      return actions;
    }

    // RULE 2: Caretaker & Fall Emergency Detection
    if (event.scenario === 'fall_emergency' || (event.dwellTimeSeconds > 60 && threatScorePercent > 60 && visitorType === VisitorTypes.RESIDENT)) {
      actions.push({
        action: 'VOICE_INTERCOM_GREET',
        deviceId: 'doorbell_front',
        message: 'GuardAgent emergency alert: I see you are on the ground. Are you injured? I am alerting designated caregivers and emergency contacts right now.',
        priority: 'URGENT'
      });
      actions.push({
        action: 'DISPATCH_CARETAKER_ALERT',
        recipients: ['Family Contact (Daughter: Sarah)', 'Primary Caretaker Phone', 'Emergency Dispatch Log'],
        severity: 'HIGH_MEDICAL_PRIORITY',
        priority: 'CRITICAL'
      });
      actions.push({
        action: 'FLOODLIGHT_ILLUMINATE',
        deviceId: 'floodlight_driveway',
        intensity: 80,
        priority: 'HIGH'
      });
      return actions;
    }

    // RULE 3: Authorized Resident Return
    if (visitorType === VisitorTypes.RESIDENT) {
      actions.push({
        action: 'VOICE_INTERCOM_GREET',
        deviceId: 'doorbell_front',
        message: 'Welcome home! Front door unlocked. Security disarmed.',
        priority: 'LOW'
      });
      actions.push({
        action: 'UNLOCK_SMART_DEADBOLT',
        deviceId: 'smart_deadbolt_front',
        temporaryDurationSeconds: 30,
        priority: 'HIGH'
      });
      return actions;
    }

    // RULE 4: False Alarm Suppression (e.g. Stray Cat / Wildlife)
    if (visitorType === VisitorTypes.ANIMAL) {
      actions.push({
        action: 'SUPPRESS_NOTIFICATION',
        reason: 'Subject classified as harmless domestic animal (cat/dog/wildlife). Motion logged silently without siren or push disturbance.',
        priority: 'LOW'
      });
      return actions;
    }

    // RULE 5: Graduated Perimeter Defense for Suspicious Individuals / Intruders
    if (level === ThreatLevels.CAUTION) {
      // Stage 1: Spotlight illumination
      actions.push({
        action: 'FLOODLIGHT_ILLUMINATE',
        deviceId: 'floodlight_driveway',
        intensity: 100,
        priority: 'MEDIUM'
      });
      actions.push({
        action: 'LOG_INCIDENT_SUMMARY',
        summary: `Stage 1 Activated: Driveway floodlights engaged at 100% due to caution threshold (${threatScorePercent}%).`
      });
    } else if (level === ThreatLevels.WARNING) {
      // Stage 2: Spotlight + Audible Warning
      actions.push({
        action: 'FLOODLIGHT_ILLUMINATE',
        deviceId: 'floodlight_driveway',
        intensity: 100,
        priority: 'HIGH'
      });
      actions.push({
        action: 'VOICE_INTERCOM_GREET',
        deviceId: 'doorbell_front',
        message: 'Attention: You are being recorded on Ring security video. Please state your business or step back from the property immediately.',
        priority: 'HIGH'
      });
    } else if (level === ThreatLevels.CRITICAL) {
      // Stage 3: Full Deterrence: Siren + Strobe + Push Alert
      actions.push({
        action: 'FLOODLIGHT_ILLUMINATE',
        deviceId: 'floodlight_driveway',
        intensity: 100,
        strobe: true,
        priority: 'CRITICAL'
      });
      actions.push({
        action: 'TRIGGER_ALARM_SIREN',
        deviceId: 'floodlight_driveway',
        durationSeconds: 30,
        priority: 'CRITICAL'
      });
      actions.push({
        action: 'VOICE_INTERCOM_GREET',
        deviceId: 'doorbell_front',
        message: 'Security breach! Ring Alarm siren sounding. Authorities and homeowner notified with video evidence.',
        priority: 'CRITICAL'
      });
      actions.push({
        action: 'DISPATCH_EMERGENCY_PUSH',
        headline: 'CRITICAL SECURITY ALERT: Intrusion Attempt Thwarted',
        threatScore: threatScorePercent,
        evidenceCaptured: true,
        priority: 'CRITICAL'
      });
    }

    return actions;
  }
};
