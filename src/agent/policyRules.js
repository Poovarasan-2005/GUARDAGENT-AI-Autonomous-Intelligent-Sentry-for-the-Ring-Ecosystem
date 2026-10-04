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
    const { visitorType, scenario } = event;

    // RULE 1: Amazon Courier Safe-Deposit Access Control
    // Safety Guarantee: Never unlocks the main residence door! Only temporary porch parcel box.
    if (visitorType === VisitorTypes.COURIER || scenario === 'courier') {
      actions.push({
        action: 'TIMELINE_STEP',
        step: 'DETECTED',
        label: 'Motion detected at Front Doorbell'
      });
      actions.push({
        action: 'TIMELINE_STEP',
        step: 'CLASSIFIED',
        label: 'Visitor identified as Amazon Prime Courier'
      });
      actions.push({
        action: 'TIMELINE_STEP',
        step: 'VERIFIED',
        label: 'Amazon parcel container verified in frame'
      });
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
        target: 'porch_parcel_box', // Strictly porch parcel box, NEVER main residence door
        priority: 'HIGH'
      });
      actions.push({
        action: 'TIMELINE_STEP',
        step: 'ACCESS_GRANTED',
        label: 'Porch parcel box unlocked for 15s (Main residence remains secured)'
      });
      actions.push({
        action: 'TIMELINE_STEP',
        step: 'PACKAGE_PLACED',
        label: 'Package placement verified in delivery area'
      });
      actions.push({
        action: 'TIMELINE_STEP',
        step: 'LOCKED',
        label: 'Delivery lock auto-secured and verified'
      });
      actions.push({
        action: 'TIMELINE_STEP',
        step: 'COMPLETED',
        label: 'Zero-touch courier delivery flow completed'
      });
      actions.push({
        action: 'LOG_INCIDENT_SUMMARY',
        summary: 'Amazon delivery verified. Safe parcel drop-off initiated; delivery box relocked automatically.'
      });
      return actions;
    }

    // RULE 2: Package Theft Attempt (Porch Pirate)
    if (visitorType === VisitorTypes.PORCH_PIRATE || scenario === 'theft') {
      actions.push({
        action: 'FLOODLIGHT_ILLUMINATE',
        deviceId: 'floodlight_driveway',
        intensity: 100,
        strobe: true,
        priority: 'CRITICAL'
      });
      actions.push({
        action: 'VOICE_INTERCOM_GREET',
        deviceId: 'doorbell_front',
        message: 'Step back! Package theft detected and recorded. Police dispatch initiated.',
        priority: 'CRITICAL'
      });
      actions.push({
        action: 'TRIGGER_ALARM_SIREN',
        deviceId: 'floodlight_driveway',
        durationSeconds: 25,
        priority: 'CRITICAL'
      });
      actions.push({
        action: 'CAPTURE_EVIDENCE_SNAPSHOT',
        evidenceType: 'CRYPTOGRAPHIC_PERIMETER_BURST',
        priority: 'CRITICAL'
      });
      actions.push({
        action: 'DISPATCH_EMERGENCY_PUSH',
        headline: 'CRITICAL: Package Theft Attempt Thwarted',
        threatScore: threatScorePercent,
        priority: 'CRITICAL'
      });
      return actions;
    }

    // RULE 3: Caretaker & Fall Emergency Detection
    if (scenario === 'fall_emergency' || (event.dwellTimeSeconds > 60 && threatScorePercent > 60 && visitorType === VisitorTypes.RESIDENT)) {
      actions.push({
        action: 'VOICE_INTERCOM_GREET',
        deviceId: 'doorbell_front',
        message: 'GuardAgent emergency alert: I see you are on the ground. Are you injured? I am alerting designated caregivers and emergency contacts right now.',
        priority: 'URGENT'
      });
      actions.push({
        action: 'DISPATCH_CARETAKER_ALERT',
        recipients: ['Family Contact (Sarah - Daughter)', 'Primary Caretaker Service', 'Emergency Dispatch Log'],
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

    // RULE 4: Authorized Resident Return
    if (visitorType === VisitorTypes.RESIDENT) {
      actions.push({
        action: 'VOICE_INTERCOM_GREET',
        deviceId: 'doorbell_front',
        message: 'Welcome home Sarah! Front deadbolt unlocked. Perimeter security disarmed.',
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

    // RULE 5: False Alarm Suppression (e.g. Stray Cat / Wildlife)
    if (visitorType === VisitorTypes.ANIMAL) {
      actions.push({
        action: 'SUPPRESS_NOTIFICATION',
        reason: 'Subject classified as harmless domestic animal (cat/dog/wildlife). Motion logged silently without siren or push disturbance.',
        priority: 'LOW'
      });
      return actions;
    }

    // RULE 6: Unknown Daytime Visitor / Solicitor
    if (visitorType === VisitorTypes.STRANGER || scenario === 'unknown_visitor') {
      actions.push({
        action: 'VOICE_INTERCOM_GREET',
        deviceId: 'doorbell_front',
        message: 'Hello, the residents are currently unavailable. Please leave a business card or call by phone. Have a great day.',
        priority: 'NORMAL'
      });
      actions.push({
        action: 'LOG_INCIDENT_SUMMARY',
        summary: 'Unknown daytime visitor engaged with standard sentry courtesy message. Access remained locked.'
      });
      return actions;
    }

    // RULE 7: Graduated Perimeter Defense for Suspicious Individuals / Intruders
    // Stage 1 (Alert) -> Stage 2 (Voice Warning) -> Stage 3 (Active Deterrence 110dB Siren & Evidence)
    if (level === ThreatLevels.CAUTION) {
      // Stage 1: Spotlight illumination (100%)
      actions.push({
        action: 'STAGE_1_ALERT',
        title: 'STAGE 1 — ALERT: Lighting Active 100%'
      });
      actions.push({
        action: 'FLOODLIGHT_ILLUMINATE',
        deviceId: 'floodlight_driveway',
        intensity: 100,
        priority: 'MEDIUM'
      });
    } else if (level === ThreatLevels.WARNING) {
      // Stage 2: Spotlight + Audible Warning
      actions.push({
        action: 'STAGE_1_ALERT',
        title: 'STAGE 1 — ALERT: Lighting Active 100%'
      });
      actions.push({
        action: 'FLOODLIGHT_ILLUMINATE',
        deviceId: 'floodlight_driveway',
        intensity: 100,
        priority: 'HIGH'
      });
      actions.push({
        action: 'STAGE_2_VOICE',
        title: 'STAGE 2 — VOICE DETERRENCE'
      });
      actions.push({
        action: 'VOICE_INTERCOM_GREET',
        deviceId: 'doorbell_front',
        message: 'You are being recorded on Ring security. Please state your business or leave the premises immediately.',
        priority: 'HIGH'
      });
    } else if (level === ThreatLevels.CRITICAL) {
      // Full 3-Stage Escalation
      actions.push({
        action: 'STAGE_1_ALERT',
        title: 'STAGE 1 — ALERT: Lighting Active 100%'
      });
      actions.push({
        action: 'FLOODLIGHT_ILLUMINATE',
        deviceId: 'floodlight_driveway',
        intensity: 100,
        strobe: true,
        priority: 'CRITICAL'
      });
      actions.push({
        action: 'STAGE_2_VOICE',
        title: 'STAGE 2 — VOICE DETERRENCE'
      });
      actions.push({
        action: 'VOICE_INTERCOM_GREET',
        deviceId: 'doorbell_front',
        message: 'You are being recorded on Ring security. Please state your business or leave the premises immediately.',
        priority: 'CRITICAL'
      });
      actions.push({
        action: 'STAGE_3_DETERRENCE',
        title: 'STAGE 3 — ACTIVE DETERRENCE: 110dB Siren & Escalation'
      });
      actions.push({
        action: 'TRIGGER_ALARM_SIREN',
        deviceId: 'floodlight_driveway',
        durationSeconds: 30,
        priority: 'CRITICAL'
      });
      actions.push({
        action: 'CAPTURE_EVIDENCE_SNAPSHOT',
        evidenceType: 'HIGH_RES_CRYPTOGRAPHIC_SNAPSHOT',
        priority: 'CRITICAL'
      });
      actions.push({
        action: 'DISPATCH_EMERGENCY_PUSH',
        headline: 'CRITICAL SECURITY INCIDENT ESCALATED',
        threatScore: threatScorePercent,
        status: 'CONTAINED',
        priority: 'CRITICAL'
      });
    }

    return actions;
  }
};
