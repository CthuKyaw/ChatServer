require("dotenv").config();
const app = require("express")();
const https = require('https');
const cors = require("cors");

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
	methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
	credentials: true
}));

const PORT = process.env.PORT || 3002;

app.get('/', (req, res) => {
	res.send('Running');
});

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

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));