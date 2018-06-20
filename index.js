var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var path = require('path');
 
var spawn = require('child_process').spawn;
var datadir = '/run/user/1000/stream';
var streamImg = datadir + '/image_stream.jpg';
var proc;

if (!fs.existsSync(datadir)) {
  fs.mkdirSync(datadir);
  fs.createReadStream(__dirname + '/loading.jpg').pipe(fs.createWriteStream(streamImg));
}
 
app.use('/', express.static(datadir));
app.use('/assets/', express.static(__dirname + '/assets'));
 
 
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});
 
var sockets = {};
 
io.on('connection', function(socket) {
 
  sockets[socket.id] = socket;
  console.log("Total clients connected : ", Object.keys(sockets).length);
 
  socket.on('disconnect', function() {
    delete sockets[socket.id];
 
    // no more sockets, kill the stream
    if (Object.keys(sockets).length == 0) {
      app.set('watchingFile', false);
      if (proc) proc.kill();
    }
  });
 
  socket.on('start-stream', function() {
    startStreaming(io);
  });
 
});
 
http.listen(3000, function() {
  console.log('listening on *:3000');
});
 
function stopStreaming() {
  if (Object.keys(sockets).length == 0) {
    app.set('watchingFile', false);
    if (proc) proc.kill();
  }
}
 
function startStreaming(io) {
 
  if (app.get('watchingFile')) {
    io.sockets.emit('liveStream', 'image_stream.jpg?_t=' + (Math.random() * 100000));
    return;
  }
 
  var args = ["-w", "640", "-h", "480", "-o", datadir + "/image_stream.jpg", "-t", "999999999", "-tl", "20"];
  proc = spawn('raspistill', args);
 
  console.log('Watching for changes...');
 
  app.set('watchingFile', true);
 
  function watcher(event, filename) {
    if (event === 'change') io.sockets.emit('liveStream', 'image_stream.jpg?_t=' + (Math.random() * 100000));
  }

  fs.watch(datadir, {recursive:true}, watcher);
 
}

