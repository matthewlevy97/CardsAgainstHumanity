/*
IF blackcard changes
	see who new winner is

*/


$(document).ready(function() {
	// Create login box
	$('<input>', { id: 'roomID', type: 'text', placeholder: 'Room ID' }).appendTo('#login');
	$('<input>', { id: 'name', type: 'text', placeholder: 'Name' }).appendTo('#login');
	$('<button>', { id: 'btn', type: 'button', text: 'Login', click: function() {
		var roomID = $('#roomID').val();
		var name   = $('#name').val();
		
		if(roomID != '' && name != '') {
			// Setup Game
			setup(roomID, name);
		} else {
			// Cannot Provide NULL values
			console.log('Null Values Provided');
		}
		
	}}).appendTo('#login');
	
	function setup(roomID, name) {
		// Hide Login
		$('#login').hide();
		
		// Setup Game
		var NUMBER_OF_CARDS = 5;
		
		var socket = io();
		var selectedCard = [];
		var cards = [];
		var tempCards = [];
		var waiting = false;
		
		var blackCard = '';
		var blackCardPicks = -1;
		var blackCardFormatString = '';
		
		var decider = false;
		
		var id = '';
		
		socket.on('connect', function(data) {
			socket.emit('login', { roomID: roomID, name: name });
			
			// Get 5 cards
			for(var i =0; i < NUMBER_OF_CARDS; i++) {
				socket.emit('getCard');
			}
		});
		socket.on('login', function(data) {
			id = data['id'];
		});
		socket.on('getCard', function(data) {
			// Find Open Spot To Insert Card
			for(var i = 0; i < NUMBER_OF_CARDS; i++) {
				if(cards[i] == null) {
					// Spot Found
					cards[i] = data;
					break;
				}
			}
		});
		socket.on('update', function(data) {
			
			// If decider, set self to decision screen
			if(data['decider'] == id) {
				decider = true;
			} else {
				decider = false;
			}
			
			if(decider) {
				waiting = false;
				if(tempCards == []) {
					tempCards = cards;
				}
				cards = [];
				
				for(var i = 0; i < data['players'].length; i++) {
					if(data['players'][i]['card'] == [] && data['players'][i]['id'] != id) {
						console.log('Waiting On: ');
						waiting = true;
						break;
					}
					cards.push(data['players'][i]['card'].join(''));
				}
			}
			
			// Update Black Card
			blackCard = data['blackCard']['text'];
			blackCardPicks = data['blackCard']['pick'];
			
			socket.emit('update', { roomID: roomID });
		});
		socket.on('result', function(data) {
			console.log("Results are in");
			
			// Refresh Lost Cards
			for(var i = 0; i < selectedCard.length; i++) {
				socket.emit('getCard');
			}
			
			waiting = false;
			selectedCard = [];
			cards = tempCards;
			tempCards = [];
		});
		
		// Create Black Card
		$('<div>', {id: 'blackCard', 'class': 'blackCard card'}).appendTo('#black');
		
		// Create 5 Cards
		for(var i = 0; i < NUMBER_OF_CARDS; i++) {
			$('<div>', {id: 'card' + i, 'class': 'whiteCard card', click: function() {
				selectedCard.push(parseInt($(this).attr('id').replace('card', '')));
				$(this).animate({ height: "0", top: "+=55"}, "fast");
			}}).appendTo('#cards');
		}
		
		socket.emit('update', { roomID: roomID });
		setInterval(function() {
			// Update Black Cards
			$('#blackCard').html('<p class="cardText">' + blackCard + '</p><p class="cardText">Select ' + blackCardPicks + ' Cards</p>');
			if(decider) {
				if(waiting) {
					$('#blackCard').html('<p class="cardText">You Are Picking The Winner. Please Wait...</p>');
				} else {
					for(var i = 0; i < cards.length; i++) {
						var id = '#card' + i;
						$(id).html('<p class="cardText">' + cards[i] + '</p>');
					}
					
					if(selectedCard.length != blackCardPicks) {
						if(selectedCard.length >= blackCardPicks) {
							selectedCard = [];
						}
					} else {
						// Get text of selected cards
						var selectedCards = []
						for(var i = 0; i < selectedCard.length; i++) {
							selectedCards.push(cards[selectedCard[i]]);
							cards[selectedCard[i]] = null;
						}
						
						socket.emit('result', { blackCard: blackCard, winningCard: selectedCards, roomID: roomID, name: name});
						console.log('Sending Results');
					}
				}
				
				// Don't Go Any Lower
				return;
			}
			
			if(!waiting) {
				// Update each card
				for(var i = 0; i < cards.length; i++) {
					var id = '#card' + i;
					
					if($.inArray(i, selectedCard) >= 0) {
						$(id).toggleClass('selected', true);
					} else {
						$(id).toggleClass('selected', false);
					}
					
					$(id).html('<p class="cardText">' + cards[i] + '</p>');
				}
				
				// Has a card been selected?
				if(selectedCard.length != blackCardPicks) {
					if(selectedCard.length >= blackCardPicks) {
						selectedCard = [];
					}
				} else {
					// Get text of selected cards
					var selectedCards = []
					for(var i = 0; i < selectedCard.length; i++) {
						selectedCards.push(cards[selectedCard[i]]);
						cards[selectedCard[i]] = null;
					}
					
					socket.emit('pickedCard', { card: selectedCards, roomID: roomID, name: name});
					console.log('Sending Card Selection');
					waiting = true;
					
					tempCards = cards;
					cards = [];
				}
			} else {
				$('#blackCard').html('<p class="cardText">Waiting For A Winner To Be Selected</p>');
				
				// Hide not selected Cards
				for(var i = 0; i < NUMBER_OF_CARDS; i++) {
					if($.inArray(i, selectedCard) == -1) {
						var id = '#card' + i;
						$(id).fadeTo(5, 0);
					} else {
						$(id).toggleClass('selected', true);
					}
				}
			}
		}, 500);
	}
});