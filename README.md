# 🛡️ GuardAgent AI
### Autonomous Intelligent Security & Access Control for the Ring Ecosystem
**Amazon Developer Hackathon: Build, Ship, Shape (2026)**  
**Track:** 🔔 **Ring Track** (Access Control, IoT Home Automation, Caretaking & Security)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Ring%20REST%20%26%20Streaming%20API-orange.svg)](https://developer.amazon.com/docs/ring)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org)
[![WebSockets](https://img.shields.io/badge/WebSockets-Real--Time%20Streaming-purple.svg)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Author](https://img.shields.io/badge/Developer-Poovarasan--2005-black.svg)](https://github.com/Poovarasan-2005)

---

## 📖 Executive Summary
Traditional smart doorbells and security cameras are fundamentally passive: they detect motion, ping a phone, and leave the homeowner to scramble through an app, squint at a thumbnail, and attempt to yell into a tiny microphone. When seconds matter—such as porch package theft, a prowler checking locks at 2 AM, or an elderly relative falling on the porch—human reaction is often too late or unavailable.

**GuardAgent AI** transforms passive Ring doorbells, floodlights, smart locks, and sirens into an **active, autonomous intelligent sentry**:
1. **Autonomous Two-Way Intercom Dialogue**: Engages visitors in natural, polite two-way conversation through the Ring Doorbell speaker.
2. **Deterministic Mathematical Threat Engine**: Calculates a continuous threat index $\mathcal{T}(t) \in [0, 100\%]$ evaluating visual anomalies, dwell time, zone breach, and behavioral cues.
3. **Zero-Touch Courier Safe-Deposit**: Verifies delivery parcels, gives drop-off instructions, temporarily unlocks the Ring Smart Deadbolt / parcel box, and verifies relock.
4. **Graduated Perimeter Deterrence**: Automatically escalates through 3 stages (Spotlight Illumination $\rightarrow$ Verbal Warning $\rightarrow$ 110dB Ring Siren & Push Evidence).
5. **Caretaker Emergency Dispatch**: Detects falls or disorientation on the porch, runs a voice wellness check, and alerts designated caregivers.
6. **Human-in-the-Loop & Manual Override**: Complete operator control with a physical override bar, safety policy toggles, and cryptographic incident logging.

---

## 🔄 The 7-Step Autonomous Intelligence Loop

GuardAgent AI implements a deterministic, verified autonomous control loop for all perimeter events:

```
  ┌──────────┐     ┌─────────────┐     ┌──────────┐     ┌─────────┐
  │  DETECT  │ ──► │  UNDERSTAND │ ──► │  DECIDE  │ ──► │   ACT   │
  └──────────┘     └─────────────┘     └──────────┘     └─────────┘
       ▲                                                     │
       │                                                     ▼
┌──────────────┐   ┌─────────────┐                      ┌─────────┐
│HUMAN OVERRIDE│ ◄─│     LOG     │ ◄─────────────────── │ VERIFY  │
└──────────────┘   └─────────────┘                      └─────────┘
```

1. **DETECT**: Ingests real-time events (`motion`, `ding`, `zone_breach`, `telemetry`) from Ring Video Doorbells and Floodlight Cameras.
2. **UNDERSTAND**: Multi-vector classification breaks down inputs into human presence, dwell time, recognized faces, parcel delivery, or masked anomalies.
3. **DECIDE**: Evaluates calibrated logistic threat formulation $\mathcal{T}(t)$ against configured safety policies and graduated response thresholds.
4. **ACT**: Dispatches real HTTP REST actuation to Ring devices (illuminate floodlight, unlock deadbolt, broadcast two-way voice TTS, sound 110dB siren).
5. **VERIFY**: Queries device state endpoints (`lock_state`, `floodlight_light_control`) to guarantee physical execution succeeded before advancing state.
6. **LOG**: Commits tamper-resistant incident records and streams real-time raw HTTP packets into the live Ring API Inspector.
7. **HUMAN OVERRIDE**: Homeowners retain absolute authority at all times with one-click instant overrides (`LOCK ALL`, `DISARM`, `STROBE + SIREN`).

---

## 📐 Architecture & System Flow

```mermaid
flowchart TD
    subgraph Ring Hardware Ecosystem [Ring Device Ecosystem]
        RD[Ring Video Doorbell Pro 2]
        RF[Ring Floodlight Cam Wired Pro]
        RL[Ring Smart Deadbolt Lock]
        RS[Ring 110dB Alarm Siren]
    end

    subgraph GuardAgent Core [GuardAgent Autonomous Core]
        RH[Ring Client & Webhook Ingest]
        TM[Mathematical Threat Matrix]
        PR[Policy Rules & Safety Bounds]
        AO[Autonomous Actuation Orchestrator]
    end

    subgraph Interactive Command Center [Sentry Command Center]
        UI[Glassmorphic Cyber-Sentry UI]
        API_LOG[Live Ring API Packet Inspector]
        TTS[Two-Way Speech Intercom Audio]
        OVR[Emergency Human Override Bar]
    end

    RD -->|Motion / Ding / Stream| RH
    RF -->|Zone Breach / Lux Telemetry| RH
    RH --> TM
    TM -->|T(t) Threat Index & Factors| PR
    PR -->|Validated Policy Actions| AO

    AO -->|Actuate LED Spotlight| RF
    AO -->|Actuate Lock/Unlock| RL
    AO -->|Trigger 110dB Siren| RS
    AO -->|Broadcast Voice Greeting| RD

    AO -->|WebSocket Stream| UI
    RH -->|Log Raw HTTP Payloads| API_LOG
    AO -->|Synthesize Natural Speech| TTS
    OVR -->|Instant Hardware Control| AO
```

---

## 🧮 Mathematical Threat Assessment Model

GuardAgent AI computes threat severity using a continuous logistic sigmoidal equation:

$$\mathcal{T}(t) = \sigma \left( w_v \cdot V(t) + w_t \cdot T_d(t) + w_z \cdot Z(t) + w_b \cdot B(t) - \theta_k \right)$$

Where:
- $V(t) \in [0, 1]$: Visual anomaly intensity (e.g., masked face, burglary tools, break-in posture).
- $T_d(t) = 1 - e^{-t / 25.0} \in [0, 1]$: Exponential saturation dwell time factor ($t$ = seconds on perimeter).
- $Z(t) \in [0, 1]$: Perimeter zone violation severity ($0.2$ yard, $0.6$ walkway, $0.9$ immediate threshold).
- $B(t) \in [0, 1]$: Behavioral deviation index (e.g. attempting handle turn, rapid evasion).
- $\theta_k = 2.8$: Calibrated neutral baseline offset.
- $\sigma(z) = \frac{1}{1 + e^{-z}}$: Logistic activation function mapping risk into $[0, 100\%]$.

### Calibrated Proof for 2:00 AM Prowler Scenario:
- $V(t) = 0.95$ (masked face + crowbar)
- $T_d(32) = 1 - e^{-32/25} = 0.722$ (32 seconds continuous dwell)
- $Z(t) = 0.90$ (porch threshold breach)
- $B(t) = 0.80$ (covert pacing / window peering)
- Weights: $w_v = 1.8$, $w_t = 1.2$, $w_z = 1.4$, $w_b = 1.2$, $\theta_k = 2.8$

$$z = 1.8(0.95) + 1.2(0.722) + 1.4(0.90) + 1.2(0.80) - 2.8 = 1.710 + 0.866 + 1.260 + 0.960 - 2.800 = 1.996$$
$$\mathcal{T}(t) = \frac{1}{1 + e^{-1.996}} = 0.8804 \implies \mathbf{88.0\%} \quad (\text{CRITICAL ALERT})$$

### Graduated Response Tiers:
| Threat Score $\mathcal{T}(t)$ | Tier Classification | Autonomous GuardAgent Physical Action |
| :--- | :--- | :--- |
| **0% – 39%** | `BENIGN` | Silent monitoring, pet/wildlife suppression, normal audit logging. |
| **40% – 64%** | `CAUTION` (Stage 1) | Driveway Floodlight illuminates at 100% brightness. |
| **65% – 84%** | `WARNING` (Stage 2) | Floodlight + Sentry voice warning: *"You are being recorded on Ring security video."* |
| **85% – 100%** | `CRITICAL` (Stage 3) | Strobe illumination + 110dB Ring Siren + Incident Card dispatched to homeowner. |

---

## 🛠️ Hardware Simulation Mode Transparency

> **[IMPORTANT]**: GuardAgent AI includes a complete virtual device simulator adhering to official Ring REST API schemas. When physical Ring devices are not connected, the platform operates in **SIMULATION MODE** (prominently labeled in amber on the dashboard). It models:
> - **Ring Video Doorbell Pro 2** (1536p Head-to-Toe video feed, 3D motion zones, two-way intercom)
> - **Ring Floodlight Cam Wired Pro** (2000-lumen dual LED floodlights, 110dB siren)
> - **Ring Smart Deadbolt Lock** (Z-Wave / Amazon Sidewalk lock actuator with state verification)
> - **Ring Contact Sensor & Chime Pro** (Perimeter magnetic reed switch & audible chime)

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- Any modern web browser (Google Chrome, Microsoft Edge, Firefox, Safari)

### 2. Installation & Setup
```bash
# 1. Clone the repository
git clone https://github.com/Poovarasan-2005/guardagent-ai.git
cd guardagent-ai

# 2. Install dependencies
npm install

# 3. Start GuardAgent AI
npm start
```

### 3. Open the Dashboard
Navigate to **`http://localhost:3000`** in your browser.  
Enter the Sentry Administrator PIN: **`ring_sentry_admin`** (or click *"Quick Demo Unlock"*).

---

## 🧪 Interactive Verification Scenarios

Once the dashboard is open at `http://localhost:3000`, test the 5 built-in scenarios using the trigger bar:

1. **📦 Amazon Prime Courier**:
   - Ring Doorbell rings with an Amazon delivery driver holding a package.
   - GuardAgent detects package and speaks through the doorbell: *"Hello! Thank you for the delivery. The porch parcel box has been temporarily unlocked for you. Please place the package inside and close the lid."*
   - Ring Smart Deadbolt unlocks automatically for 15 seconds, then securely relocks.
2. **🚨 Late-Night Intruder**:
   - Driveway Floodlight detects motion at 2:00 AM; masked individual with crowbar appears.
   - Threat score climbs to **88% (`CRITICAL`)**.
   - Floodlight LEDs turn on at 100%, GuardAgent issues a verbal warning, and the 110dB siren activates with red alert strobe.
3. **🔑 Resident Return**:
   - Resident recognized at the door.
   - GuardAgent greets Sarah by name and automatically unlocks the front deadbolt without manual app intervention.
4. **🐱 Harmless Pet Filter (False Alarm Mitigation)**:
   - Domestic cat roams the front yard.
   - Threat score evaluated at 4% (`BENIGN`).
   - Alarms, floodlights, and phone notifications are silently suppressed.
5. **🩺 Caretaker Fall Alert**:
   - Prolonged immobility on the porch step detected.
   - Threat score triggers emergency protocol: Sentry conducts audio check and dispatches caregiver notification.

---

## 🔍 Live Ring API Packet Inspector

The lower drawer of the dashboard includes a real-time **Ring API Inspector**. Every action taken by GuardAgent AI executes real HTTP REST requests conforming to official Ring endpoints:
- `GET /clients_api/ring_devices` — Fetch device inventory and telemetry
- `POST /clients_api/doorbots/:id/floodlight_light_control` — Control floodlight brightness
- `PUT /clients_api/doorbots/:id/lock_state` — Actuate smart deadbolt
- `POST /clients_api/doorbots/:id/siren_control` — Trigger 110dB emergency siren
- `POST /clients_api/doorbots/:id/intercom/tts_broadcast` — Broadcast two-way speech
- `POST /api/ring/webhook` — Real-time event ingestion

Filter logs by **ALL**, **ACTUATION**, **TELEMETRY**, or **ERRORS** to inspect JSON payloads in real time.

---

## 📝 Product Feedback & Friction Logs

Full Ring API product feedback and structured friction logs are documented in [DEVPOST_SUBMISSION.md](DEVPOST_SUBMISSION.md) to qualify for the **10% judging bonus**:
1. **Friction Log 1**: High-latency polling vs. native WebSocket / Webhook streaming for sub-second safety responses.
2. **Friction Log 2**: Granular OAuth token scoping for physical lock actuation vs. camera telemetry.
3. **Friction Log 3**: Low-latency bidirectional WebRTC data channel for TTS audio injection into Doorbell speakers.

---

## ⚖️ License & Author
- **Developer**: [Poovarasan](https://github.com/Poovarasan-2005)
- **License**: Released under the [MIT License](LICENSE).
