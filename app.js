var app = require('express')();
var crypto = require('crypto');
var http = require('http').Server(app);
var io = require('socket.io')(http);

var fs = require('fs');
var path = require('path');

// Loads CardsAgainstHumanity.json
var jsonData;
var filePath = path.join(__dirname, 'CardsAgainstHumanity.json');
fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data) {
	if(!err) {
		console.log("Loaded JSON");
		jsonData = JSON.parse(data);
		
	}
});
// Finished Loading

// Create Rooms
var rooms = {};

// Room Format
/*
room = {
	roomID: roomID,
	blackCard: card,
	decider: decider,
	winningCard: [],
	players: [
		{
			name: name,
			card: [],
			score: score,
			id: id
		}, ...
	]
}
*/

// Start Application
app.get('/', function(req, res){
	res.sendfile('index.html');
});
app.get('/cards.js', function(req, res){
	res.sendfile('cards.js');
});
app.get('/cards.css', function(req, res){
	res.sendfile('cards.css');
});

// Handle Connections
io.on('connection', function(socket) {
	var roomID = '';
	var name   = '';
	var id     = crypto.randomBytes(20).toString('hex');
	
	// Needed: roomID, name
	socket.on('login', function(data) {
		roomID = data['roomID'];
		name = data['name'];
		
		addPersonToRoom(roomID, name, id);
		socket.emit('login', { roomID: roomID, name: name, id: id });
	});
	
	// Needed: roomID
	socket.on('update', function(data) {
		
		// Is Decider Person Still In Room
		var found = false;
		for(var i = 0; i < rooms[roomID]['players'].length; i++) {
			if(rooms[roomID]['players'][i]['id'] == rooms[roomID]['decider']) {
				found = true;
				break;
			}
		}
		
		if(!found) {
			var decider = rooms[roomID]['players'][0]['id'];
			if(decider == null) {
				// Remove room
				removeRoom(roomID);
				return;
			} else {
				rooms[roomID]['decider'] = decider;
			}
		}
		
		// Send Updated Data
		socket.emit('update', rooms[data['roomID']]);
	});
	
	// User Picked A Card
	// Needed: roomID, card, name
	socket.on('pickedCard', function(data) {
		// Add Selected Card To Room
		var players = rooms[roomID]['players'];
		if(players[name] == null) {
			// Add Player to Room
			addPersonToRoom(roomID, name, id);
			players = rooms[roomID]['players'];
		}
		
		for(var i = 0; i < players.length; i++) {
			if(players[i]['id'] == id) {
				players[i]['card'] = data['card'];
			}
		}
	});
	
	// Needed: roomID, name, blackCard, winningCard
	socket.on('result', function(data) {
		console.log("Winner Selected For Room: " + roomID);
		
		// Best card has been selected
		var winningCard = data['winningCard'];
		var winner      = '';
		
		// Remove people who didn't submit a card and clear cards
		var room = rooms[roomID];
		for(var i = 0; i < room.length; i++) {
			if(room[i]['card'] == []) {
				// Remove person from room
				kickPersonFromRoom('inactivity');
				i--;
			} else {
				// Is this person the winner?
				if(room[i]['card'] == winningCard) {
					winner = room[i]['id'];
				}
				// Clear person's card
				room[i]['card'] = [];
			}
		}
		
		room['winningCard'] = winningCard;
		room['decider']     = winner;
		room['blackCard']   = jsonData['blackCards'][Math.floor(Math.random() * 89)];
	});
	
	socket.on('getCard', function(data) {
		// Send new card
		socket.emit('getCard', jsonData['whiteCards'][Math.floor(Math.random() * 459)]); // 459 white cards in deck
	});
	socket.on('disconnect', function(data) {
		// Remove from Room
		removePersonFromRoom(roomID, id);
	});
	
	function kickPersonFromRoom(reason) {
		removePersonFromRoom(roomID, id);
		socket.emit('kick', { reason: reason });
		socket.disconnect('kicked');
	}
});

function removeRoom(roomID) {
	delete rooms[roomID];
}
function createRoom(roomID) {
	var room = {
		roomID: roomID,
		blackCard: jsonData['blackCards'][Math.floor(Math.random() * 89)],
		decider: '',
		winningCard: [],
		players: []
	};
	
	rooms[roomID] = room;
}
function addPersonToRoom(roomID, name, id) {
	if(rooms[roomID] == null) {
		// Create Room
		createRoom(roomID);
		rooms[roomID]['decider'] = id;
	}
	
	for(var i = 0; i < rooms[roomID]['players'].length; i++) {
		if(rooms[roomID]['players'][i]['id'] == id) {
			return;
		}
	}
	rooms[roomID]['players'].push({ name: name, card: [], score: 0, id: id });
}
function removePersonFromRoom(roomID, id) {
	var players = rooms[roomID]['players'];
	for(var i = 0; i < players.length; i++) {
		if(players[i]['id'] == id) {
			players.splice(i, 1);
		}
	}
}

// Start Server
http.listen(3000, function(){
	console.log('listening on *:3000');
});