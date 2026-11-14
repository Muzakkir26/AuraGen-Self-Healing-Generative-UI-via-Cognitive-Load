/**
 * Local Mock WebSocket Server for AuraGen Telemetry (Week 1)
 *
 * Simulates Member 3's backend WebSocket endpoint:
 * - URL: ws://localhost:5000/ws/telemetry
 * - Port: 5000
 * - Path: /ws/telemetry
 *
 * NOTE: In production, the real cognitive score, friction analysis,
 * and AI trigger decisions come directly from Member 3's backend service.
 */

const { WebSocketServer } = require('ws');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const PATH = '/ws/telemetry';

const wss = new WebSocketServer({ port: PORT, path: PATH });

console.log(`[mock-ws-server] AuraGen Telemetry WebSocket Server listening on ws://localhost:${PORT}${PATH}`);

function validatePayload(data) {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Request body must be a JSON object.' };
  }

  const requiredKeys = ['mouseSpeed', 'pauseTime', 'rageClicks', 'fieldName', 'userInput'];
  for (const key of requiredKeys) {
    if (!(key in data)) {
      return { isValid: false, error: `Missing required key: "${key}". Exact keys required: ${requiredKeys.join(', ')}.` };
    }
  }

  if (typeof data.mouseSpeed !== 'number' || Number.isNaN(data.mouseSpeed)) {
    return { isValid: false, error: 'Invalid type for "mouseSpeed": must be a number.' };
  }
  if (typeof data.pauseTime !== 'number' || Number.isNaN(data.pauseTime)) {
    return { isValid: false, error: 'Invalid type for "pauseTime": must be a number.' };
  }
  if (typeof data.rageClicks !== 'number' || Number.isNaN(data.rageClicks)) {
    return { isValid: false, error: 'Invalid type for "rageClicks": must be a number.' };
  }
  if (typeof data.fieldName !== 'string') {
    return { isValid: false, error: 'Invalid type for "fieldName": must be a string.' };
  }
  if (typeof data.userInput !== 'string') {
    return { isValid: false, error: 'Invalid type for "userInput": must be a string.' };
  }

  return { isValid: true, payload: data };
}

function computeScore(mouseSpeed, pauseTime, rageClicks) {
  let speedComponent = 0;
  if (mouseSpeed >= 350) {
    speedComponent = 15;
  } else if (mouseSpeed >= 100) {
    speedComponent = 10;
  } else if (mouseSpeed >= 20) {
    speedComponent = 5;
  } else {
    speedComponent = 0;
  }

  const pauseComponent = Math.min(35, Math.floor(Math.max(0, pauseTime)) * 7);
  const rageComponent = Math.min(40, Math.max(0, rageClicks) * 10);
  const rawScore = speedComponent + pauseComponent + rageComponent;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));
  const triggerAI = score >= 70 || rageClicks >= 3 || pauseTime >= 5;

  return { score, triggerAI };
}

wss.on('connection', (ws, req) => {
  console.log(`[mock-ws-server] Client connected from ${req.socket.remoteAddress}`);

  ws.on('message', (message) => {
    let parsed;
    try {
      parsed = JSON.parse(message.toString());
    } catch (err) {
      ws.send(JSON.stringify({
        success: false,
        score: 0,
        triggerAI: false,
        stuckField: '',
        savedValue: '',
        error: 'Invalid JSON message.'
      }));
      return;
    }

    const validation = validatePayload(parsed);
    if (!validation.isValid) {
      ws.send(JSON.stringify({
        success: false,
        score: 0,
        triggerAI: false,
        stuckField: '',
        savedValue: '',
        error: validation.error
      }));
      return;
    }

    const { mouseSpeed, pauseTime, rageClicks, fieldName, userInput } = validation.payload;
    const { score, triggerAI } = computeScore(mouseSpeed, pauseTime, rageClicks);

    const response = {
      success: true,
      score,
      triggerAI,
      stuckField: fieldName,
      savedValue: userInput
    };

    ws.send(JSON.stringify(response));
  });

  ws.on('close', () => {
    console.log('[mock-ws-server] Client disconnected');
  });

  ws.on('error', (err) => {
    console.error('[mock-ws-server] Socket error:', err.message);
  });
});

process.on('SIGINT', () => {
  wss.close(() => {
    console.log('[mock-ws-server] Server terminated');
    process.exit(0);
  });
});

