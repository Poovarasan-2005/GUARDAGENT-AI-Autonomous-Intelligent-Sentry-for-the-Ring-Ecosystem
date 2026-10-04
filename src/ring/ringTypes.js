/**
 * GuardAgent AI - Ring Types & Constants
 * Amazon Developer Hackathon 2026 - Ring Track
 */

export const DeviceTypes = {
  DOORBELL: 'doorbell_v4',
  FLOODLIGHT_CAM: 'floodlight_cam_wired_pro',
  SMART_LOCK: 'smart_deadbolt_lock',
  ALARM_SIREN: 'alarm_siren_pro',
  CHIME: 'chime_pro_v2'
};

export const EventTypes = {
  MOTION: 'motion',
  DING: 'ding',
  TWO_WAY_AUDIO_START: 'two_way_audio_start',
  TWO_WAY_AUDIO_END: 'two_way_audio_end',
  FLOODLIGHT_SET: 'floodlight_set',
  LOCK_SET: 'lock_set',
  SIREN_SET: 'siren_set',
  ZONE_BREACH: 'zone_breach'
};

export const ThreatLevels = {
  BENIGN: 'BENIGN',           // 0 - 39%
  CAUTION: 'CAUTION',         // 40 - 64% (Stage 1: Floodlight)
  WARNING: 'WARNING',         // 65 - 84% (Stage 2: Voice Deterrent)
  CRITICAL: 'CRITICAL'        // 85 - 100% (Stage 3: Siren & Alert)
};

export const VisitorTypes = {
  COURIER: 'COURIER',
  RESIDENT: 'RESIDENT',
  NEIGHBOR: 'NEIGHBOR',
  STRANGER: 'STRANGER',
  SUSPICIOUS: 'SUSPICIOUS',
  ANIMAL: 'ANIMAL'
};
