// TODO: Rename to availablePlayers
const allPlayers = [];
const availablePlayers = [];
let playerCount = 0;
module.exports.playerCount = playerCount;
module.exports.availablePlayers = availablePlayers;
module.exports.allPlayers = allPlayers;

exports.disconnect = (socket) => {
  console.log('Disconnected:', socket.id);

  allPlayers.splice(allPlayers.indexOf(socket.id), 1);
  playerCount = allPlayers.length;

  for (const currentPlayer of allPlayers) {
    socket.nsp.to(currentPlayer).emit('players online', playerCount);
  }

};