const allPlayers = [];
const availablePlayers = [];
let playerCount = 0;
module.exports.playerCount = playerCount;
module.exports.availablePlayers = availablePlayers;
module.exports.allPlayers = allPlayers;

exports.disconnect = (socket) => {
  console.log('Disconnected:', socket.id);

  // If the user which disconnected was in the list of available players,
  // remove it from there
  let indexToDelete = null;
  for (let i = 0; i < availablePlayers.length; i++) {
    const currentPlayer = availablePlayers[i];
    console.log(`Comparting ${currentPlayer.id} with ${socket.id}`);

    if (currentPlayer.id === socket.id) {
      console.log('MATCH - An element will be deleted');

      indexToDelete = String(i);
    }
  }

  console.log("The index to delete is:", indexToDelete);

  if (indexToDelete) {
    availablePlayers.splice(Number(indexToDelete), 1);
  }

  console.log('Available Players:');
  console.log(JSON.stringify(availablePlayers, null, 4));

  allPlayers.splice(allPlayers.indexOf(socket.id), 1);
  playerCount = allPlayers.length;

  for (const currentPlayer of allPlayers) {
    socket.nsp.to(currentPlayer).emit('players online', playerCount);
  }

};

exports.makePlayerAvailable = (socket, name) => {
  const newPlayer = {
    id: socket.id,
    name: name,
    board: null
  };

  if (availablePlayers.length === 0) {
    availablePlayers.push(newPlayer);
    // Now that the user has been made available, update the client
    socket.nsp.to(socket.id).emit('updateClient', 'wait');
  } else {
    let opponent = availablePlayers.splice(0, 1)[0];
    console.log('Oponent:', opponent);

    socket.nsp.to(socket.id).emit('updateClient', 'pair');
    socket.nsp.to(opponent.id).emit('updateClient', 'pair');
    console.log(`Pairing ${newPlayer.name} with ${opponent.name}`);

  }
  console.log('Available Players:');
  console.log(JSON.stringify(availablePlayers, null, 4));

}