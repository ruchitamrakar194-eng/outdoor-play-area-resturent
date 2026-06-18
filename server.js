const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/sockets/socket.manager');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
app.use(cors({
  origin: [
    "http://localhost:5173",
    // "https://sarnic-new.netlify.app/",

  ],
  credentials: true
}));
// Initialize Socket.IO
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
