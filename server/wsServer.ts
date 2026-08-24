import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function initWebSocketServer(server: HttpServer) {
  wss = new WebSocketServer({ server, path: '/ws/delivery' });

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);

    // Send initial handshake
    ws.send(
      JSON.stringify({
        type: 'CONNECTED',
        payload: { message: 'Real-time Last-Mile Dispatch Stream connected', timestamp: new Date().toISOString() },
      })
    );

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        // Handle client keep-alive ping or subscription
        if (data.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch (err) {
        console.error('WS message parse error', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('WS client error', err);
      clients.delete(ws);
    });
  });

  return wss;
}

export function broadcastEvent(event: { type: string; payload: any }) {
  const payloadStr = JSON.stringify(event);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payloadStr);
      } catch (err) {
        console.error('Failed to send WS message', err);
      }
    }
  });
}
