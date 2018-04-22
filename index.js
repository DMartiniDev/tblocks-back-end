const app = require('express')();
const port = process.env.PORT || 3001;
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const socketsLogic = require('./sockets_logic.js');

io.on('connection', (socket) => {

  console.log(`The following socket has been connected: ${socket.id}`);

  socket.nsp.to(socket.id).emit('broadcast seeks', socketsLogic.seeks);
  socket.nsp.to(socket.id).emit('connectionID', socket.id);

  socket.on('disconnect', () => socketsLogic.disconnect(socket));
});

http.listen(port, () => console.log(`Listening on port ${port}`));