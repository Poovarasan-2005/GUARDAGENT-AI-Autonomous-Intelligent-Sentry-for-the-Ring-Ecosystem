# 🛡️ GuardAgent AI
### Autonomous Intelligent Security & Access Control for the Ring Ecosystem
**Amazon Developer Hackathon: Build, Ship, Shape (2026)**  
**Track:** 🔔 **Ring Track** (Access Control, IoT Home Automation, Caretaking & Security)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Ring%20REST%20%26%20Streaming%20API-orange.svg)](https://developer.amazon.com/docs/ring)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org)
[![WebSockets](https://img.shields.io/badge/WebSockets-Real--Time%20Streaming-purple.svg)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

---

## 📖 Executive Summary
Traditional smart doorbells and security cameras are fundamentally passive: they detect motion, ping a phone, and leave the homeowner to scramble through an app, squint at a thumbnail, and attempt to yell into a tiny microphone. When seconds matter—such as porch package theft, a prowler checking locks at 2 AM, or an elderly relative falling on the porch—human reaction is often too late or unavailable.

**GuardAgent AI** transforms passive Ring doorbells, floodlights, smart locks, and sirens into an **active, autonomous intelligent sentry**:
1. **Autonomous Two-Way Intercom Dialogue**: Engages visitors in natural, polite two-way conversation through the Ring Doorbell speaker.
2. **Deterministic Mathematical Threat Engine**: Calculates a continuous threat index $\mathcal{T}(t) \in [0, 100\%]$ evaluating visual anomalies, dwell time, zone breach, and behavioral cues.
3. **Zero-Touch Courier Safe-Deposit**: Verifies delivery parcels, gives drop-off instructions, temporarily unlocks the Ring Smart Deadbolt / parcel box, and verifies relock.
4. **Graduated Perimeter Deterrence**: Automatically escalates through 3 stages (Spotlight Illumination $\rightarrow$ Verbal Warning $\rightarrow$ 110dB Ring Siren & Push Evidence).
5. **Caretaker Emergency Dispatch**: Detects falls or disorientation on the porch, runs a voice wellness check, and alerts designated caregivers.

---

## 📐 Architecture & System Flow

```mermaid
flowchart TD
    subgraph Ring Ecosystem
        RD[Ring Video Doorbell Pro 2]
        RF[Ring Floodlight Cam Wired Pro]
        RL[Ring Smart Deadbolt Lock]
        RS[Ring 110dB Alarm Siren]
    end

    subgraph GuardAgent Core
        RH[Ring Client & Webhook Ingest]
        TM[Mathematical Threat Matrix]
        PR[Policy Rules & Safety Bounds]
        AO[Autonomous Actuation Orchestrator]
    end

    subgraph Interactive Command Center
        UI[Glassmorphic Cyber-Sentry UI]
        API_LOG[Live Ring API Packet Inspector]
        TTS[Two-Way Speech Intercom Audio]
    end

    RD -->|Motion / Ding / Stream| RH
    RF -->|Zone Breach / Lux Telemetry| RH
    RH --> TM
    TM -->|T(t) Score & Breakdown| PR
    PR -->|Recommended Actions| AO

    AO -->|Actuate LED Spotlight| RF
    AO -->|Actuate Lock/Unlock| RL
    AO -->|Trigger 110dB Siren| RS
    AO -->|Broadcast Voice Greeting| RD

    AO -->|WebSocket Stream| UI
    RH -->|Log HTTP Payloads| API_LOG
    AO -->|Synthesize Speech| TTS
```

---

## 🧮 Mathematical Threat Assessment Model

GuardAgent AI uses a logistic sigmoidal multi-vector formulation to score security risk in real time:

$$\mathcal{T}(t) = \sigma \left( w_v \cdot V(t) + w_t \cdot T_d(t) + w_z \cdot Z(t) + w_b \cdot B(t) - \theta_k \right)$$

Where:
- $V(t) \in [0, 1]$: Visual anomaly intensity (e.g., masked face, burglary tools, break-in posture).
- $T_d(t) = 1 - e^{-t / 25.0} \in [0, 1]$: Exponential saturation dwell time factor.
- $Z(t) \in [0, 1]$: Perimeter zone violation severity.
- $B(t) \in [0, 1]$: Behavioral deviation index.
- $\theta_k = 3.4$: Calibrated neutral baseline offset.
- $\sigma(z) = \frac{1}{1 + e^{-z}}$: Logistic activation function mapping risk into $[0, 100\%]$.

### Graduated Response Tiers:
| Threat Score $\mathcal{T}(t)$ | Tier Classification | Autonomous GuardAgent Physical Action |
| :--- | :--- | :--- |
| **0% – 39%** | `BENIGN` | Silent monitoring, pet/wildlife suppression, normal logging. |
| **40% – 64%** | `CAUTION` (Stage 1) | Driveway Floodlight illuminates at 100% brightness. |
| **65% – 84%** | `WARNING` (Stage 2) | Floodlight + Sentry voice warning: *"You are being recorded on Ring security video."* |
| **85% – 100%** | `CRITICAL` (Stage 3) | Strobe illumination + 110dB Ring Siren + Cryptographic snapshot dispatch to homeowner. |

---

## 🚀 Quick Start Guide (For Hackathon Judges)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- Any modern web browser (Chrome, Edge, Firefox, Safari)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/guardagent-ai.git
cd guardagent-ai

# Install dependencies
npm install
```

### 3. Run GuardAgent AI
```bash
# Start the server and simulator
npm start
```

Open your browser to:
👉 **`http://localhost:3000`**

---

## 🧪 Interactive Judge Verification Suite
Once the dashboard is open at `http://localhost:3000`, test the following built-in scenarios using the trigger buttons:

1. **📦 Amazon Prime Courier**:
   - Ring Doorbell rings.
   - Courier with Amazon parcel detected.
   - GuardAgent speaks: *"Hello! Thank you for the delivery. The porch parcel box has been temporarily unlocked for you..."*
   - Ring Smart Deadbolt unlocks automatically for 15 seconds, then securely relocks.
2. **🚨 Late-Night Intruder**:
   - Driveway Floodlight detects motion at 2:00 AM.
   - Masked subject with crowbar detected.
   - Threat matrix spikes to **88% (`CRITICAL`)**.
   - Floodlight LEDs turn on at 100%, GuardAgent issues a stern audible warning, and the Ring 110dB siren activates with red alert strobe.
3. **🔑 Resident Return**:
   - Resident Sarah recognized.
   - GuardAgent welcomes her home and unlocks the front deadbolt without any manual app interaction.
4. **🐱 Harmless Pet Filter (False Alarm Mitigation)**:
   - Domestic cat roams front yard.
   - Threat score evaluated at 4% (`BENIGN`).
   - Alarms and notifications are silently suppressed.
5. **🩺 Caretaker Fall Alert**:
   - Prolonged immobility on porch step detected.
   - Threat score triggers emergency protocol: Sentry conducts audio check and dispatches caregiver notification.

---

## 🔍 Live Ring API Packet Inspector
The lower panel of the dashboard includes a real-time **Ring API Inspector**. Every action taken by GuardAgent AI executes real HTTP REST requests conforming to official Ring endpoints:
- `GET /clients_api/ring_devices`
- `POST /clients_api/doorbots/:id/floodlight_light_control`
- `PUT /clients_api/doorbots/:id/lock_state`
- `POST /clients_api/doorbots/:id/siren_control`
- `POST /clients_api/doorbots/:id/intercom/tts_broadcast`
- `POST /api/ring/webhook`

---

## 📝 Product Feedback & Friction Logs
Full product feedback and structured friction logs are documented in [DEVPOST_SUBMISSION.md](DEVPOST_SUBMISSION.md) to qualify for the **10% judging bonus**.

---

## ⚖️ License
Released under the [MIT License](LICENSE).
