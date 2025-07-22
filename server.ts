// File: server.ts
import { WebSocketServer, WebSocket } from 'ws';

const rooms = new Map<string, Set<WebSocket>>();
const wss = new WebSocketServer({ port: 8080 });
console.log('Server WebSocket berjalan di port 8080');

wss.on('connection', ws => {
  ws.on('message', message => {
    try {
      const data = JSON.parse(message.toString());
      const { type, payload } = data;
      let roomName = payload.roomName; // Assume roomName is in payload

      if (type === 'join_room') {
        if (!rooms.has(roomName)) {
            rooms.set(roomName, new Set());
        }
        const room = rooms.get(roomName)!;
        room.add(ws);
        (ws as any).roomName = roomName; // Associate room with WebSocket connection
        console.log(`Client joined room: ${roomName}. Total clients in room: ${room.size}`);
        // Notify others in the room
        broadcastToRoom(roomName, ws, { type: 'player_joined', payload: { message: `New player joined ${roomName}` }});
      } else {
        // For other message types, broadcast them to the same room
        if ((ws as any).roomName) {
            broadcastToRoom((ws as any).roomName, ws, data);
        } else {
            console.warn("Received message from client not in any room.");
        }
      }
    } catch (e) {
      console.error("Pesan tidak valid atau gagal diproses:", e);
    }
  });

  ws.on('close', () => {
    const roomName = (ws as any).roomName;
    if (roomName && rooms.has(roomName)) {
        const room = rooms.get(roomName)!;
        room.delete(ws);
        console.log(`Client left room: ${roomName}. Total clients in room: ${room.size}`);
        if (room.size === 0) {
            rooms.delete(roomName);
            console.log(`Room ${roomName} is now empty and has been closed.`);
        } else {
            // Notify remaining clients
            broadcastToRoom(roomName, ws, { type: 'player_left', payload: { message: `A player has left ${roomName}` } });
        }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function broadcastToRoom(roomName: string, exclude: WebSocket, message: object) {
  const room = rooms.get(roomName);
  if (room) {
    room.forEach(client => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        try {
            client.send(JSON.stringify(message));
        } catch(e) {
            console.error(`Gagal mengirim pesan ke client di room ${roomName}:`, e);
        }
      }
    });
  }
}
