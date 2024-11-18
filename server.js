const WebSocket = require('ws');

const port = process.env.PORT || 8080;
const server = new WebSocket.Server({ port });
console.log('WebSocket сервер запущен');
const rooms = {};

server.on('connection', (socket) => {
  console.log('Новое соединение установлено');

  let currentRoom = null;

  console.log('Client connected');

  socket.on('message', (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'create_room':
        handleCreateRoom(socket, data.roomID);
        break;

      case 'join_room':
        handleJoinRoom(socket, data.roomID);
        break;

      case 'set_video':
        handleSetVideo(socket, data.roomID, data.videoID);
        break;

      case 'video_action':
        handleVideoAction(socket, data.roomID, data.action, data.time);
        break;

      default:
        console.error('Неизвестный тип сообщения:', data.type);
    if (data.type === 'video_action') {
      const roomID = data.roomID;
      if (rooms[roomID]) {
        rooms[roomID].clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && client !== socket) {
            client.send(
              JSON.stringify({
                type: 'video_action',
                action: data.action,
                time: data.time,
              })
            );
          }
        });
      }
    }
    

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
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].users = rooms[currentRoom].users.filter(
        (user) => user !== socket
      );
      console.log(`Пользователь покинул комнату ${currentRoom}`);
    }
  });

  function handleCreateRoom(socket, roomID) {
    if (rooms[roomID]) {
      socket.send(
        JSON.stringify({ type: 'error', message: 'Комната уже существует' })
      );
      return;
    }

    rooms[roomID] = {
      videoID: null,
      users: [socket],
    };
    currentRoom = roomID;

    socket.send(
      JSON.stringify({ type: 'room_created', roomID })
    );

    console.log(`Комната ${roomID} создана`);
  }

  function handleJoinRoom(socket, roomID) {
    if (!rooms[roomID]) {
      socket.send(
        JSON.stringify({ type: 'error', message: 'Комната не найдена' })
      );
      return;
    }

    rooms[roomID].users.push(socket);
    currentRoom = roomID;

    socket.send(
      JSON.stringify({
        type: 'room_state',
        roomID,
        videoID: rooms[roomID].videoID,
      })
    );

    console.log(`Пользователь присоединился к комнате ${roomID}`);
  }

  function handleSetVideo(socket, roomID, videoID) {
    if (!rooms[roomID]) {
      socket.send(
        JSON.stringify({ type: 'error', message: 'Комната не найдена' })
      );
      return;
    }

    rooms[roomID].videoID = videoID;

    broadcast(roomID, {
      type: 'set_video',
      roomID,
      videoID,
    });

    console.log(`В комнате ${roomID} установлено новое видео: ${videoID}`);
  }

  function handleVideoAction(socket, roomID, action, time) {
    if (!rooms[roomID]) {
      socket.send(
        JSON.stringify({ type: 'error', message: 'Комната не найдена' })
      );
      return;
    }

    broadcast(roomID, {
      type: 'video_action',
      roomID,
      action,
      time,
    });

    console.log(
      `Действие "${action}" в комнате ${roomID} на времени ${time}`
    );
  }

  function broadcast(roomID, message) {
    if (!rooms[roomID]) return;

    rooms[roomID].users.forEach((user) => {
      if (user.readyState === WebSocket.OPEN) {
        user.send(JSON.stringify(message));
      }
    });
  }
});
    for (const roomID in rooms) {
      rooms[roomID].clients = rooms[roomID].clients.filter((client) => client !== socket);
    }
    console.log('Client disconnected');
  });
});

console.log(`WebSocket server running on port ${port}`);
