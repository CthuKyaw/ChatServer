require("dotenv").config();
const fs = require('fs');
const app = require("express")();
const https = require('https');
const cors = require("cors");

const users = {};
const socketToRoom = {};

var key = fs.readFileSync('./cert/selfsigned.key', 'utf8');
var cert = fs.readFileSync('./cert/selfsigned.crt', 'utf8');
var options = {
	key: key,
	cert: cert
};

const server = https.createServer(options, app);

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

/*
io.on("connection", (socket) => {
	socket.emit("me", socket.id);

	socket.on("disconnect", () => {
		socket.broadcast.emit("callEnded")
	});

	socket.on("callUser", ({ userToCall, signalData, from, name }) => {
		io.to(userToCall).emit("callUser", { signal: signalData, from, name });
	});

	socket.on("answerCall", (data) => {
		io.to(data.to).emit("callAccepted", data.signal)
	});
});
*/

io.on('connection', socket => {
    socket.on("join room", roomID => {
        if (users[roomID]) {
            const length = users[roomID].length;
            if (length === 4) {
                socket.emit("room full");
                return;
            }
            users[roomID].push(socket.id);
        } else {
            users[roomID] = [socket.id];
        }
        socketToRoom[socket.id] = roomID;
        const usersInThisRoom = users[roomID].filter(id => id !== socket.id);

        socket.emit("all users", usersInThisRoom);
    });

    socket.on("sending signal", payload => {
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
    });

    socket.on("returning signal", payload => {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomID] = room;
        }
    });

});


server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));