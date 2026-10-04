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

// Query live Ring API call logs (for Inspector)
app.get('/api/ring/api-logs', (req, res) => {
  res.json({ success: true, logs: ringClient.requestLog });
});

// Official Ring Webhook Receiver Endpoint
app.post('/api/ring/webhook', async (req, res) => {
  console.log('[Ring Webhook Received]:', req.body);
  const payload = req.body;
  ringClient.logApiCall('POST', '/api/ring/webhook', payload, { acknowledged: true }, 200);

  // Ingest into GuardAgent if valid
  if (payload && payload.kind) {
    await guardAgent.handleRingEvent(payload);
  }

  res.status(200).json({ status: 'ACK_PROCESSED' });
});

// 5. WebSocket connection handler
wss.on('connection', (ws) => {
  // Send initial snapshot
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    payload: {
      devices: ringSimulator.getDevices(),
      agentStatus: guardAgent.getStatus(),
      apiLogs: ringClient.requestLog.slice(0, 10),
      activeIncident: guardAgent.activeIncident
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
  console.log(`⚡ Mode: ${ringClient.isSimulator ? 'RING SIMULATOR (DEV/DEMO)' : 'RING LIVE CLOUD API'}`);
  console.log(`🏆 Amazon Developer Hackathon 2026 - Ring Track`);
  console.log(`========================================================\n`);
});
