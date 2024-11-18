const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8080 });
console.log('WebSocket сервер запущен на ws://localhost:8080');

const rooms = {}; 

server.on('connection', (socket) => {
  console.log('Новое соединение установлено');

  let currentRoom = null;


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

  // Отправка сообщений всем пользователям комнаты
  function broadcast(roomID, message) {
    if (!rooms[roomID]) return;

    rooms[roomID].users.forEach((user) => {
      if (user.readyState === WebSocket.OPEN) {
        user.send(JSON.stringify(message));
      }
    });
  }
});
