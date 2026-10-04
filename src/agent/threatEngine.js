/**
 * GuardAgent AI - Mathematical Threat Engine
 * Evaluates real-time threat vectors using a multi-factor logistic scoring function:
 *   T(t) = sigma( w_v * V(t) + w_t * T_d(t) + w_z * Z(t) + w_b * B(t) - theta_k )
 * Amazon Developer Hackathon 2026 - Ring Track
 */

import { ThreatLevels } from '../ring/ringTypes.js';

export class ThreatEngine {
  constructor(config = {}) {
    this.weights = {
      wv: config.wv || 3.8,  // Visual anomaly weight (masked face, crowbar, break-in posture)
      wt: config.wt || 2.2,  // Dwell time decay weight (seconds hovering in monitored zone)
      wz: config.wz || 2.6,  // Perimeter zone severity weight
      wb: config.wb || 2.4   // Behavioral deviation weight
    };
    this.biasThreshold = config.biasThreshold || 3.4; // Neutral calibration offset
  }

  /**
   * Sigmoid logistic activation function
   */
  sigmoid(z) {
    return 1 / (1 + Math.exp(-z));
  }

  /**
   * Computes normalized dwell time factor [0, 1] with exponential saturation
   */
  computeDwellFactor(seconds) {
    if (!seconds || seconds <= 5) return 0.05;
    // Saturation curve: 30+ seconds approaches 1.0
    return Math.min(1.0, 1.0 - Math.exp(-seconds / 25.0));
  }

  /**
   * Evaluates comprehensive threat score given an event telemetry payload
   */
  evaluate(event) {
    const V = Math.max(0, Math.min(1, event.visualAnomaly || 0));
    const Td = this.computeDwellFactor(event.dwellTimeSeconds || 0);
    const Z = event.perimeterZoneBreach ? 1.0 : (event.eventType === 'ding' ? 0.1 : 0.4);
    const B = Math.max(0, Math.min(1, event.behaviorVector || 0));

    // Raw linear logit calculation
    const logit = (
      this.weights.wv * V +
      this.weights.wt * Td +
      this.weights.wz * Z +
      this.weights.wb * B -
      this.biasThreshold
    );

    // Sigmoid probability score
    const rawScore = this.sigmoid(logit);
    const threatScorePercent = Math.round(rawScore * 100);

    // Classification mapping
    let level = ThreatLevels.BENIGN;
    if (threatScorePercent >= 85) {
      level = ThreatLevels.CRITICAL;
    } else if (threatScorePercent >= 65) {
      level = ThreatLevels.WARNING;
    } else if (threatScorePercent >= 40) {
      level = ThreatLevels.CAUTION;
    }

    const breakdown = {
      visualAnomalyScore: Math.round(V * 100),
      dwellFactorScore: Math.round(Td * 100),
      zoneBreachScore: Math.round(Z * 100),
      behaviorScore: Math.round(B * 100),
      logit: parseFloat(logit.toFixed(3)),
      threatScorePercent,
      level,
      timestamp: new Date().toISOString()
    };

    return breakdown;
  }
}
