const seeks = [];                             // List of seeks / Available players

module.exports.seeks = seeks;

exports.postSeek = (socket) => { console.log('Post Seek') };
exports.acceptSeek = (socket, seekID) => { console.log('Accept Seek') };
exports.move = (data, socket) => { console.log('Move') };
exports.disconnect = (socket) => { console.log(`The socket ${socket.id} just disconnected`) };