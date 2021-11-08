require("dotenv").config();
const fs = require('fs');
const app = require("express")();
const https = require('https');
const http = require('http');
const cors = require("cors");

let socketList = {};

var key = fs.readFileSync('./cert/selfsigned.key', 'utf8');
var cert = fs.readFileSync('./cert/selfsigned.crt', 'utf8');
var options = {
	key: key,
	cert: cert
};

const server = https.createServer(options, app);
//const server = http.createServer(app);

const io = require("socket.io")(server, {
	cors: {
		origin: `${process.env.CORS_CLIENT_HOST}`,
		methods: ["GET", "POST"]
	}
});

app.use(cors({
	origin: `${process.env.CORS_CLIENT_HOST}`,
	methods: ["GET", "POST"]
}));

const PORT = process.env.PORT || 3002;

app.get('/', (req, res) => {
	res.send('Running');
});

// Socket
io.on('connection', (socket) => {
    console.log(`New User connected: ${socket.id}`);
  
    socket.on('disconnect', () => {
      socket.disconnect();
      console.log('User disconnected!');
    });
  
    socket.on('BE-check-user', ({ roomId, userName }) => {
      let error = false;
  
      io.sockets.in(roomId).clients((err, clients) => {
        clients.forEach((client) => {
          if (socketList[client] == userName) {
            error = true;
          }
        });
        socket.emit('FE-error-user-exist', { error });
      });
    });
  
    /**
     * Join Room
     */
    socket.on('BE-join-room', ({ roomId, userName }) => {
      // Socket Join RoomName
      socket.join(roomId);
      socketList[socket.id] = { userName, video: true, audio: true };
  
      // Set User List
      io.sockets.in(roomId).clients((err, clients) => {
        try {
          const users = [];
          clients.forEach((client) => {
            // Add User List
            users.push({ userId: client, info: socketList[client] });
          });
          socket.broadcast.to(roomId).emit('FE-user-join', users);
          // io.sockets.in(roomId).emit('FE-user-join', users);
        } catch (e) {
          io.sockets.in(roomId).emit('FE-error-user-exist', { err: true });
        }
      });
    });
  
    socket.on('BE-call-user', ({ userToCall, from, signal }) => {
      io.to(userToCall).emit('FE-receive-call', {
        signal,
        from,
        info: socketList[socket.id],
      });
    });
  
    socket.on('BE-accept-call', ({ signal, to }) => {
      io.to(to).emit('FE-call-accepted', {
        signal,
        answerId: socket.id,
      });
    });
  
    socket.on('BE-send-message', ({ roomId, msg, sender }) => {
      io.sockets.in(roomId).emit('FE-receive-message', { msg, sender });
    });
  
    socket.on('BE-leave-room', ({ roomId, leaver }) => {
      delete socketList[socket.id];
      socket.broadcast
        .to(roomId)
        .emit('FE-user-leave', { userId: socket.id, userName: [socket.id] });
      io.sockets.sockets[socket.id].leave(roomId);
    });
  
    socket.on('BE-toggle-camera-audio', ({ roomId, switchTarget }) => {
      if (switchTarget === 'video') {
        socketList[socket.id].video = !socketList[socket.id].video;
      } else {
        socketList[socket.id].audio = !socketList[socket.id].audio;
      }
      socket.broadcast
        .to(roomId)
        .emit('FE-toggle-camera', { userId: socket.id, switchTarget });
    });
  });


server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));