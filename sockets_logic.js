const uuid = require('uuid');
const allPlayers = [];
const availablePlayers = [];
const games = {};
let playerCount = 0;
module.exports.playerCount = playerCount;
module.exports.availablePlayers = availablePlayers;
module.exports.allPlayers = allPlayers;

exports.disconnect = (socket) => {
  // If the user which disconnected was in the list of available players,
  // remove it from there
  let indexToDelete = null;
  for (let i = 0; i < availablePlayers.length; i++) {
    const currentPlayer = availablePlayers[i];

    if (currentPlayer.id === socket.id) {

      indexToDelete = String(i);
    }
  }

  if (indexToDelete) {
    availablePlayers.splice(Number(indexToDelete), 1);
  }

  allPlayers.splice(allPlayers.indexOf(socket.id), 1);
  playerCount = allPlayers.length;

  for (const currentPlayer of allPlayers) {
    socket.nsp.to(currentPlayer).emit('players online', playerCount);
  }

};

exports.keyPressed = (data) => {
  const gameID = data.player.gameID;
  const userID = data.player.id;

  const boardIndex = games[gameID].players.indexOf(userID);
  const board = games[gameID].boards[boardIndex];
  if (data.key === 'left') {
    board.playerMove(-1);
  }
  if (data.key === 'right') {
    board.playerMove(1);
  }
  if (data.key === 'up') {
    board.playerRotate(1);
  }
  if (data.key === 'down') {
    board.playerDrop();
  }
  if (data.key === 'spacebar') {
    board.playerDropToBottom();
  }
}

exports.makePlayerAvailable = (socket, name) => {
  const newPlayer = {
    id: socket.id,
    name: name,
    board: null,
    gameID: null
  };

  if (availablePlayers.length === 0) {
    availablePlayers.push(newPlayer);
    // Now that the user has been made available, update the client
    socket.nsp.to(socket.id).emit('updateClient', {status:'wait', player: null, opponent: null});
  } else {
    let opponent = availablePlayers.splice(0, 1)[0];

    // Create Game in the server:
    const gameID = uuid();

    // Create a match
    const p1Board = new TeltrisGame(gameID, newPlayer.id, socket);
    const p2Board = new TeltrisGame(gameID, opponent.id, socket);

    games[gameID] = {
      players: [newPlayer.id, opponent.id],
      boards: [p1Board, p2Board]
    };

    newPlayer.gameID = gameID;
    opponent.gameID = gameID;

    socket.nsp.to(socket.id).emit('updateClient', {status:'pair', player: newPlayer, opponent: opponent});
    socket.nsp.to(opponent.id).emit('updateClient', {status:'pair', player: opponent, opponent: newPlayer});
    p1Board.playerReset();
    p1Board.update();
    p2Board.playerReset();
    p2Board.update();
  }
}




colors = [
  null,
  '#a000f0',    // T
  '#f0a000',    // L
  '#0000f0',    // J
  '#00f000',    // S
  '#f00000',    // Z
  '#00f0f0',    // L
  '#f0f000'     // O
];

class TeltrisGame {
  constructor(gameID, playerID, socket) {
    this.socket = socket;
    this.gameID = gameID;
    this.playerID = playerID;
    // ------ Game Data ------
    // Board
    this.arena = createMatrix(12, 20);

    // Piece
    this.player = {
      pos: {
        x: 4,
        y: 0
      },
      matrix: null,
      score: 0,
    }

    this.dropCounter = 0;
    this.dropInterval = 1000;
    this.updateInterval = null;
    this.lastTime = 0;

    // ------ Initialisation ------
    // Initialisation of the game
    // TODO: this.updateScore();
  }

  testGame() {
    setInterval(() => {
      if (this.arena[2][0] === 1) {
        this.arena[2].fill(0);
      } else {
        this.arena[2].fill(1);
      }

      for (const currentClient of games[this.gameID].players) {
        this.socket.nsp.to(currentClient).emit('updateBoard', {board:this.arena, playerID: this.playerID});
      }
    }, 1000);
  }







  // ------ Functions ------
  clear() {
    arenaSweep(this.arena, this.player);
  }

  emitBoardStatus() {
    for (const currentClient of games[this.gameID].players) {
      this.socket.nsp.to(currentClient).emit('updateBoard', {board: this.arena, player:this.player, playerID: this.playerID});
    }
  }

  playerDrop() {
    this.player.pos.y++;
    if (collide(this.arena, this.player)) {
      this.player.pos.y--;
      merge(this.arena, this.player);
      this.playerReset();
      arenaSweep(this.arena, this.player);
    }
    this.dropCounter = 0;
    this.emitBoardStatus();
  }

  playerDropToBottom() {
    while (!collide(this.arena, this.player)) {
      this.player.pos.y++;
    }

    this.player.pos.y--;
    merge(this.arena, this.player);
    this.playerReset();
    arenaSweep(this.arena, this.player);
    this.dropCounter = 0;
    this.emitBoardStatus();
  }

  playerReset() {
    const pieces = 'ILJOTSZ';
    this.player.matrix = createPiece(pieces[Math.floor(pieces.length * Math.random())]);
    this.player.pos.y = 0;
    this.player.pos.x = (this.arena[0].length / 2 | 0) - (Math.floor(this.player.matrix[0].length / 2));

    if (collide(this.arena, this.player)) {
      // Get the name of the player who lost
      let loser;
      for (let z = 0; z < games[this.gameID].players.length; z++) {
        const currentPlayer = games[this.gameID].players[z];
        if (currentPlayer === this.playerID) {
          loser = currentPlayer;
        }
      }

      for (const currentClient of games[this.gameID].players) {
        if (currentClient === loser) {
          this.socket.nsp.to(currentClient).emit('finishGame', 'You lost');
        } else {
          this.socket.nsp.to(currentClient).emit('finishGame', 'You won');
        }

      }
      clearInterval(this.updateInterval);
      // this.player.score = 0;
      // this.updateScore();
    }
  }

  update() {
    this.updateInterval = setInterval(() => {
      this.playerDrop();
      for (const currentClient of games[this.gameID].players) {
        this.socket.nsp.to(currentClient).emit('updateBoard', {board: this.arena, player:this.player, playerID: this.playerID});
      }
    }, this.dropInterval)
  }

  playerMove (direction) {
    this.player.pos.x += direction;

    if(collide(this.arena, this.player)) {
      this.player.pos.x -= direction;
    }
    this.emitBoardStatus();
  }

  playerRotate (dir) {
    rotate(this.player.matrix, dir);
    const pos = this.player.pos.x;
    let offset = 1;

    while (collide(this.arena, this.player)) {
      this.player.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1: -1));

      if (offset > this.player.matrix[0].length) {
        rotate(this.player.matrix, -dir);
        this.player.pos.x = pos;
        return;
      }
    }
    this.emitBoardStatus();
  }

}


// ----------------------- GAME LOGIC ------------------------------------- //
/**
 * Clear any lines that can be cleared in the arena specified. For each line
 * cleared, add 10 points to the score of the player.
 */
arenaSweep = (arena, player) => {
  let rowCount = 1;
  outer: for (let y = arena.length -1; y > 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }

    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;

    player.score += rowCount*10;
  }
}

rotate = (matrix, direction) => {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < y; x++) {
      [
        matrix[x][y],
        matrix[y][x],
      ] = [
        matrix[y][x],
        matrix[x][y],
      ];
    }
  }

  if (direction > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

/**
 * Check if there is a collision between the player's piece and
 */
collide = (arena, player) => {
  const [m, o] = [player.matrix, player.pos];

  for (let y=0; y < m.length; y++) {
    for (let x=0;x< m[y].length; ++x) {
      if (m[y][x] !== 0 && (arena[y + o.y] && arena[y+o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
}

createPiece = (type) => {
  if (type === 'T') {
    return [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0]
    ];
  }

  if (type === 'L') {
    return [
      [0,2,0],
      [0,2,0],
      [0,2,2]
    ]
  }

  if (type === 'J') {
    return [
      [0,3,0],
      [0,3,0],
      [3,3,0]
    ]
  }

  // z
  if (type === 'Z') {
    return [
      [0,4,4],
      [4,4,0],
      [0,0,0]
    ]
  }

  // s
  if (type === 'S') {
    return [
      [5,5,0],
      [0,5,5],
      [0,0,0]
    ]
  }

  if (type === 'I') {
    return [
      [0, 0, 6, 0, 0],
      [0, 0, 6, 0, 0],
      [0, 0, 6, 0, 0],
      [0, 0, 6, 0, 0],
      [0, 0, 6, 0, 0]
    ]
  }

  if (type === 'O') {
    return [
      [7,7],
      [7,7]
    ]
  }
}

// ------------------------------- Helper Functions ------------------------- //
boardToDraw = (arena, player) => {
  const newBoard = arena.slice(0);
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if(value !== 0) {
        newBoard[y + player.pos.y][x + player.pos.x] = value;
      }
    })
  })
  return newBoard;
}

createMatrix = (width, height) => {
  const matrix = [];
  while (height--) {
    matrix.push(new Array(width).fill(0));
  }
  return matrix;
}

merge = (arena, player) => {
  try {
    player.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if(value !== 0) {
          arena[y + player.pos.y][x + player.pos.x] = value;
        }
      })
    })
  } catch (error) {
    //
  }
}