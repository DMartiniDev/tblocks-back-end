const app = require('express')();
const port = process.env.PORT || 3001;
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const socketsLogic = require('./sockets_logic.js');

io.on('connection', (socket) => {
  socketsLogic.allPlayers.push(socket.id);

  for (const currentPlayer of socketsLogic.allPlayers) {
    // Broadcast the player count to all players online
    socket.nsp.to(currentPlayer).emit('players online', socketsLogic.allPlayers.length);
  }

  socket.on('makePlayerAvailable', (name) => {
    socketsLogic.makePlayerAvailable(socket, name);
  });

  socket.on('keyPressed', (data) => {
    socketsLogic.keyPressed(data);
  });


  socket.on('disconnect', () => socketsLogic.disconnect(socket));
});

http.listen(port, () => console.log(`Listening on port ${port}`));