/**
 * GuardAgent AI - Application Server & Real-time WebSocket Hub
 * Amazon Developer Hackathon 2026 - Ring Track
 */

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { RingSimulator } from './src/ring/ringSimulator.js';
import { RingClient } from './src/ring/ringClient.js';
import { GuardAgent } from './src/agent/guardAgent.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// 1. Initialize Ring Simulator, Client, and GuardAgent
const ringSimulator = new RingSimulator();
const ringClient = new RingClient({
  refreshToken: process.env.RING_REFRESH_TOKEN,
  locationId: process.env.RING_LOCATION_ID,
  simulatorInstance: ringSimulator
});
const guardAgent = new GuardAgent(ringClient, ringSimulator);

// 2. Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 3. WebSocket broadcasting helper
const broadcastToClients = (data) => {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

guardAgent.setBroadcastCallback((payload) => {
  broadcastToClients(payload);
});

// Broadcast Ring device state updates
ringSimulator.onEvent((event) => {
  broadcastToClients({ type: 'RING_EVENT', payload: event });
});

// 4. REST API Endpoints

// Authentication Login Endpoint (Requested for home page access gate)
app.post('/api/auth/login', (req, res) => {
  const { sentryId, accessKey } = req.body;
  // Accept standard judge access or any non-empty demo password
  const isValid = (!sentryId && !accessKey) || 
                  (sentryId === 'judge@amazon-dev.com' || sentryId === 'admin') || 
                  (accessKey && accessKey.length >= 3);

  if (isValid) {
    res.json({
      success: true,
      token: 'sentry_sec_token_' + Date.now(),
      user: {
        id: sentryId || 'judge_demo',
        name: 'Amazon Hackathon Reviewer',
        role: 'Master Security Supervisor',
        clearanceLevel: 'LEVEL_4_FULL_ACTUATION'
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials. Use Quick Judge Access.' });
  }
});

// Get all Ring devices
app.get('/api/devices', async (req, res) => {
  const devices = await ringClient.getDevices();
  res.json({ success: true, devices });
});

// Device Control: Smart Deadbolt Lock / Unlock
app.post('/api/devices/:id/lock', async (req, res) => {
  const { id } = req.params;
  const { lock } = req.body;
  const result = await ringClient.setLock(id, lock);
  broadcastToClients({ type: 'DEVICE_UPDATED', deviceId: id, state: result });
  res.json(result);
});

// Device Control: Floodlight Cam Toggle
app.post('/api/devices/:id/floodlight', async (req, res) => {
  const { id } = req.params;
  const { state, intensity } = req.body;
  const result = await ringClient.setFloodlight(id, state, intensity);
  broadcastToClients({ type: 'DEVICE_UPDATED', deviceId: id, state: result });
  res.json(result);
});

// Device Control: Alarm Siren Toggle
app.post('/api/devices/:id/siren', async (req, res) => {
  const { id } = req.params;
  const { active, durationSeconds } = req.body;
  const result = await ringClient.triggerSiren(id, active, durationSeconds);
  broadcastToClients({ type: 'DEVICE_UPDATED', deviceId: id, state: result });
  res.json(result);
});

// Device Control: Two-way Voice Intercom Broadcast
app.post('/api/devices/:id/intercom', async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const result = await ringClient.broadcastVoiceMessage(id, message);
  res.json(result);
});

// Trigger a realistic security scenario
app.post('/api/scenarios/trigger', (req, res) => {
  const { scenario } = req.body;
  const event = ringSimulator.triggerEvent(scenario || 'courier');
  res.json({ success: true, triggeredScenario: scenario, event });
});

// Reset Demo Environment
app.post('/api/demo/reset', (req, res) => {
  const result = ringSimulator.reset();
  guardAgent.resetAgent();
  broadcastToClients({ type: 'DEMO_RESET', result });
  res.json({ success: true, message: 'Demo reset successfully.' });
});

// Manual Human Override Action
app.post('/api/agent/override', async (req, res) => {
  const { command, parameters } = req.body;
  const log = await guardAgent.handleManualOverride(command, parameters);
  res.json({ success: true, overrideLog: log });
});

// Update GuardAgent operating mode
app.post('/api/agent/mode', (req, res) => {
  const { mode } = req.body;
  const updated = guardAgent.setMode(mode);
  res.json({ success: true, mode: updated });
});

// Query GuardAgent status and threat metrics
app.get('/api/agent/status', (req, res) => {
  res.json({ success: true, status: guardAgent.getStatus() });
});

// Query live Ring API call logs (for Inspector) - With token/secret redaction
app.get('/api/ring/api-logs', (req, res) => {
  const sanitizedLogs = (ringClient.requestLog || []).map(entry => {
    const copy = { ...entry };
    if (copy.payload && typeof copy.payload === 'object') {
      const sanitizedPayload = { ...copy.payload };
      if (sanitizedPayload.token) sanitizedPayload.token = '[REDACTED]';
      if (sanitizedPayload.secret) sanitizedPayload.secret = '[REDACTED]';
      copy.payload = sanitizedPayload;
    }
    return copy;
  });
  res.json({ success: true, logs: sanitizedLogs });
});

// Official Ring Webhook Receiver Endpoint
app.post('/api/ring/webhook', async (req, res) => {
  const payload = req.body;
  ringClient.logApiCall('POST', '/api/ring/webhook', payload, { acknowledged: true }, 200);

  if (payload && (payload.kind || payload.eventType)) {
    await guardAgent.handleRingEvent(payload);
  }

  res.status(200).json({ status: 'ACK_PROCESSED' });
});

// 5. WebSocket connection handler
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    payload: {
      devices: ringSimulator.getDevices(),
      agentStatus: guardAgent.getStatus(),
      apiLogs: ringClient.requestLog.slice(0, 15),
      activeIncident: guardAgent.activeIncident,
      lastSecurityIncidentRecord: guardAgent.lastSecurityIncidentRecord
    }
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.action === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch (e) {}
  });
});

// 6. Start Server
server.listen(PORT, HOST, () => {
  console.log(`\n========================================================`);
  console.log(`🛡️  GUARDAGENT AI - SENTRY CONTROL CENTER IS ONLINE`);
  console.log(`🔗 Local Interface: http://localhost:${PORT}`);
  console.log(`⚡ Mode: ${ringClient.isSimulator ? 'RING HARDWARE SIMULATOR (VIRTUAL MESH)' : 'RING LIVE CLOUD API'}`);
  console.log(`🏆 Amazon Developer Hackathon 2026 - Ring Track`);
  console.log(`========================================================\n`);
});
