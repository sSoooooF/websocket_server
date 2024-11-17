const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8080 });
const rooms = {};

server.on('connection', (socket) => {
  socket.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'join') {
      const room = data.room;
      if (!rooms[room]) {
        rooms[room] = [];
      }
      rooms[room].push(socket);

      rooms[room].forEach((client) => {
        if (client !== socket && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'newUser' }));
        }
      });
    }

    if (data.type === 'sync') {
      const room = data.room;
      rooms[room].forEach((client) => {
        if (client !== socket && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'sync', payload: data.payload }));
        }
      });
    }
  });

  socket.on('close', () => {
    for (const room in rooms) {
      rooms[room] = rooms[room].filter((client) => client !== socket);
    }
  });
});

console.log('WebSocket server is running on');
