const WebSocket = require('ws');

const port = process.env.PORT || 8080;
const server = new WebSocket.Server({ port });

const rooms = {};

server.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('message', (message) => {
    const data = JSON.parse(message);

    // Создание комнаты
    if (data.type === 'create_room') {
      const roomID = data.roomID;
      rooms[roomID] = {
        video: null, 
        clients: [], 
      };
      rooms[roomID].clients.push(socket);
      console.log(`Room ${roomID} created`);
      socket.send(JSON.stringify({ type: 'room_created', roomID }));
    }

    if (data.type === 'join_room') {
      const roomID = data.roomID;
      if (rooms[roomID]) {
        rooms[roomID].clients.push(socket);
        console.log(`Client joined room: ${roomID}`);
        socket.send(
          JSON.stringify({
            type: 'room_state',
            video: rooms[roomID].video,
          })
        );
      } else {
        socket.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
      }
    }

    if (data.type === 'set_video') {
      const roomID = data.roomID;
      if (rooms[roomID]) {
        rooms[roomID].video = data.video;
        rooms[roomID].clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: 'video_updated',
                video: data.video,
              })
            );
          }
        });
      }
    }
  });

  socket.on('close', () => {
    for (const roomID in rooms) {
      rooms[roomID].clients = rooms[roomID].clients.filter((client) => client !== socket);
    }
    console.log('Client disconnected');
  });
});

console.log(`WebSocket server running on port ${port}`);
