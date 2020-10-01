const card_dir = "cards"

const connectionOptions = {
		"force new connection": true,
		"transports": ["websocket"]
	};

var socket = io.connect(SOCKETIO_URL, connectionOptions);
var username;
var game;
var uid;
var gid;
var selected_card;
var players;
var current_turn;
var game_state = "none";
var played_cards;
var local_card;
var turn_index;
var prompt;

var player_guesses;

function shuffle(array) {
  let n = array.length;
  let shuffled = new Array(n);
  let indices = [...Array(n).keys()];

  for(let i = 0;i < n; i++) {
    index = indices.splice(Math.floor(Math.random() * (n - i)), 1)[0];
    shuffled[index] = array[i];
  }
  return shuffled;
}

function update_player_table(table, data) {
	$(table + " tr").remove();
	data.forEach(function(user) {
		$(table).append("<tr><td>"+user.name+
			"</td><td>" + user.game + "</td></tr>");
	});
}

function show_error(text) {
	$("#error_text").text(text);
}

function clear_error() {
	$("#error_text").text("");
}

function notify(text) {
	$("#notify_text").text(text);
}

function clear_notify() {
	$("#notify_text").text("");
}

function update_players(on_updated) {
	socket.emit("get users", gid, function(data) {
		log("Received updated list of users.");
		sorted_users = data.sort((user1, user2) => {
			return user1.turn_order >= user2.turn_order;
		});

		$("#players tr").remove();
		players = new Map();
		sorted_users.forEach(function(user) {
			players.set(user.uid, user);
			log(user);
			user_class = "";
			if(user.uid == uid) {
				user_class += " local-uid";
			}
			$("#players table").append("<tr class='player" + user_class + "'uid='" + user.uid + "'><td>"+user.name+"</td><td class='score'>" + user.score + "</td></tr>");
		});
		log(on_updated);
		if(on_updated && typeof on_updated == "function") {
			on_updated();
		}
	});
}

function update_player_scores() {
	for (let [uid, player] of players) {
		$("#players tr[uid=" + uid + "] td.score").text(player.score);
	}
}

function update_storyteller_text() {
	$("#turn_text").removeClass("hidden");
	$("#turn_text").text("Storyteller: " + players.get(current_turn).name);
}

function update_cards(data) {
	log("got card update");
	log(data.cards);

	$("#hand ul li").remove();
	
	if(game_state == 'guess' || game_state == 'secret') {
		$("#table .card-list li").remove();
	}

	data.cards.forEach(function(card) {
		if(card.uid == uid && card.state == 'hand') {
			console.log("card "+ card.uid);
			$("#hand ul").append("<li cid=" + card.cid +"><a href='#' class='card-link'><img src='"
				+ card_dir + "/" + card.filename+"' /></a></li>");
		} else if (card.state == 'table') {
			card.filename = card_dir + "/" + card.filename;
			other_player_secret(card);
		}
	});

	log("remaining cards: ")
	log(data.remaining);
	$("#cards-remaining").text("Cards in deck: " + data.remaining);

	register_card_listeners();

	if(game_state == "guess") {
		start_guess_round({order:[]});
	}
}

function reveal_guesses() {
	for (let [cid, card] of played_cards) {
		let card_name = players.get(card.uid).name;
		card_elt = $("#revealed-cards li[cid='" + cid + "'] .card-owner");
		card_elt.text(card_name);
		if(card.uid == current_turn) {
			$("#revealed-cards li[cid='" + cid + "']").addClass("correct-uid");
		}
	}
	for (let [uid, guess] of player_guesses) {
		$("#revealed-cards li[cid=" + guess.cid + "] .guess-info ul").append(
			"<li>" + players.get(uid).name + "</li>"
			);
	}
	$("#revealed-cards li").removeClass("local-card");

}

function clear_selection() {
	selected_card = null;
	$("#hand li").removeClass("active");
	$("#table li").removeClass("active");
	$("#hand li").addClass("inactive");
	$("#table li").addClass("inactive");
	$("#guess-card button").prop("disabled", true);
	$(".choose-secret button").prop("disabled", true);
	$(".prompt #submit").prop("disabled", true);
}

function set_players_waiting(except) {
	$(".player").addClass("waiting-move");
	player_element(except).removeClass("waiting-move");
}

function remove_from_hand(cid) {
	$("#hand li[cid=" + cid + "]").remove();
}

function filename_by_cid(cid) {
	return $("li[cid=" + cid + "] img").attr("src");
}

function player_element(p_uid) {
	return $(".player[uid=" + p_uid + "]");
}


function setup_game(res) {
	username = res.username;
	game = res.game;
	uid = res.uid;
	gid = res.gid;

	let game_data = res.game_data;

	game_state = game_data.state;
	turn_index = game_data.turn_index;
	current_turn = game_data.turn;

	$("#room-text").text(game);
	$("#gameboard").removeClass("hidden");
	$("#join-controls").addClass("hidden");

	
	update_players(() => {
		if(game_state == 'prompt') {
			start_prompt_round({
				uid:game_data.turn
			});
		} else if(game_state == 'secret') {
			start_secret_round({
				prompt:game_data.prompt
			});
		} else if(game_state == 'guess') {
			played_cards = new Map();
		}

		if(game_state != 'pregame') {
			$("#game-start").addClass("hidden");
			update_storyteller_text();
			socket.emit("get cards", {
				gid:gid
			});
		}
	});
}

function card_listener(event, parent) {
	event.preventDefault();
	if((game_state == "prompt" && uid == current_turn && parent == "#hand") ||
		(game_state == "secret" && uid != current_turn && parent == "#hand") ||
		(game_state == "guess" && uid != current_turn && parent == "#table")) {

		let clicked_cid = Number($(event.target).parent().parent().attr("cid"));
		
		if(game_state == "guess" && played_cards.get(clicked_cid).uid == uid) {
			return;
		}

		$(parent + " li").removeClass("active");
		$(parent + " li").addClass("inactive");

		selected_card = clicked_cid;
		log("selected card = " + selected_card);
		$(event.target).parent().parent().addClass("active");
		$(event.target).parent().parent().removeClass("inactive");

		$("#guess-card button").prop("disabled", false);
		$(".choose-secret button").prop("disabled", false);
		$(".prompt #submit").prop("disabled", false);
	}
}

function image_hover_listener(event) {
	$("#card-viewer img").attr("src", $(event.target).attr("src"));
}

function register_card_listeners() {
	$("#hand a").click(event => {
		card_listener(event, "#hand");
	});
	$("#table a").click(event => {
		card_listener(event, "#table");
	});

	$("#hand img").hover(image_hover_listener);
	$("#table img").hover(image_hover_listener);
}


//global game events
function reset_game(data) {
	$(".prompt").addClass("hidden");
	$(".choose-secret").addClass("hidden");
	$(".hint").addClass("hidden");
	$("#turn_text").addClass("hidden");
	$(".player").removeClass("waiting-move");
	$("#guess-card").addClass("hidden");
	$("#cards-remaining").text("");

	$(".card-list li").remove();

	$("#game-start").removeClass("hidden");

	update_players();
}

function game_started(data) {
	turn_index = 0;
	log("game start message received");
	$("#game-start").addClass("hidden");
}

function start_prompt_round(turn_data) {
	log("begin new round. state: player_prompt");
	log("turn_data:");
	log(turn_data);
	clear_selection();
	clear_notify();
	game_state = "prompt";
	$("#hand a").removeClass("active");
	current_turn = turn_data.uid;
	$(".player").removeClass("waiting-move");
	player_element(current_turn).addClass("waiting-move");
	if(uid == turn_data.uid) {
		$(".prompt").removeClass("hidden");
	}
	update_storyteller_text();
}

function start_secret_round(data) {
	game_state = "secret";
	log("game state changed to choose_secret");
	clear_selection();
	clear_notify();
	set_players_waiting(current_turn);

	$(".hint").removeClass("hidden");
	$("#prompt_text").text(data.prompt);

	if(uid != current_turn) {
		$(".choose-secret").removeClass("hidden");
	} else {
		notify("Wait for the other players to choose their cards.");
	}
	$("#revealed-cards li").remove();
	played_cards = new Map();
}

function start_guess_round(data) {
	game_state = "guess";
	log("game state changed to guesses");
	clear_selection();
	clear_notify();

	player_guesses = new Map();
	set_players_waiting(current_turn);
	sorted_cids = Array.from(played_cards.keys()).sort();
	log("sorted cids:");
	log(sorted_cids);
	log(data.order);

	//if we rejoin in the middle of a guess round, then the cards are in a different order
	if(data.order.length != sorted_cids.length) {
		data.order = shuffle([...Array(sorted_cids.length).keys()]);
	}
	log(data.order);

	data.order.forEach(index => {
		cid = sorted_cids[index];
		log("inserting card " + cid);
		$("#revealed-cards ul.card-list").append("<li cid=" + cid + "><a href='#'>" + 
			"<img src='" + played_cards.get(cid).filename + "' /></a><div class='guess-info'>" +
			"<span class='card-owner'></span><ul></ul></div></li>");
	});
	$("#revealed-cards li[cid=" + local_card + "]").addClass("local-card");
	register_card_listeners();
	$("#unrevealed-cards li").remove();
	if(uid == current_turn) {
		$("#guess-card").addClass("hidden");
		notify("Wait for the other players to make their guesses.");
	} else {
		$("#guess-card").removeClass("hidden");
	}
}

function end_turn() {
	log("end of turn, computing new player scores");
	let all_correct = true;
	let all_incorrect = true;
	let point_changes = new Map();
	for (let [uid, player] of players) {
		point_changes.set(uid, 0);
	}
	log("current turn player uid is " + current_turn);
	for (let [uid, data] of player_guesses) {
		opp_uid = played_cards.get(data.cid).uid;
		log("player " + uid + " guessed card of player " + opp_uid);
		if(opp_uid == current_turn) {
			point_changes.set(uid, point_changes.get(uid) + 3);
			all_incorrect = false;
		} else {
			players.get(opp_uid).score += 1;
			all_correct = false;
		}
	}
	point_changes.set(current_turn, 3);
	for (let [uid, player] of players) {
		if(!all_correct && !all_incorrect) {
			player.score += point_changes.get(uid);
		} else if(uid != current_turn){
			player.score += 2;
		}
		log(player.username + " now has score " + player.score);
	}

	update_player_scores();

	reveal_guesses();

	socket.emit("score update", {
		uid:uid,
		score:players.get(uid).score
	});
}

//local player actions
function submit_prompt_card() {
	log("submitting prompt.");
	log("selected card: " + selected_card);
	if(selected_card == null) {
		return;
	}
	socket.emit("prompt", {
		prompt:$("#prompt_inp").val(),
		uid:uid,
		gid:gid,
		filename: filename_by_cid(selected_card),
		cid:selected_card
	}, function (data) {
		$(".prompt").addClass("hidden");
	});

	remove_from_hand(selected_card);
}

function choose_secret_card() {
	if(selected_card != null) {
		log("choosing secret card: " + selected_card);
		socket.emit("choose secret", {
			cid:selected_card,
			filename: filename_by_cid(selected_card),
			uid:uid,
			turn:current_turn,
			username:username,
			gid:gid,
			num_players:players.size
		});

		remove_from_hand(selected_card);
		$(".choose-secret").addClass("hidden");
	}
}

function guess_card() {
	//TODO: validate selected card
	turn_index += 1;
	socket.emit("guess card", {
		cid:selected_card,
		uid:uid,
		username:username,
		gid:gid,
		turn_index:turn_index
	});
	$("#guess-card").addClass("hidden");
}

//remote player actions

function other_player_prompt(data) {
	start_secret_round(data);
	other_player_secret(data);
}

function other_player_secret(data) {
	if(game_state == 'secret') {
		$("#unrevealed-cards ul").append("<li class='facedown'><div>" + 
		players.get(data.uid).name + "</div></li>");
		player_element(data.uid).removeClass("waiting-move");
	}
	log("player "+ data.uid + " played card " + data.cid);
	if(data.uid == uid) {
		local_card = data.cid;
	}

	played_cards.set(data.cid, {uid:data.uid, filename:data.filename});
}

function other_player_guess(data) {
	if(game_state == 'guess') {
		player_element(data.uid).removeClass("waiting-move");
	}	
	player_guesses.set(data.uid, {cid:data.cid});
}


//callbacks
function join_callback(res) {
	if(res.response == "success") {
		log("join request accepted.");
		clear_error();
		setup_game(res);
		
	} else if(res["response"] == "error") {
		if(res["error"] == "user_in_game") {
			show_error("There is already a user with the name '"+
				res["username"] + "' in the game '" + res["game"] + "'.");
		} else if (res["error"] == "in_progress") {
			show_error("That game is in progress and isn't accepting new players.");
		} else if(res.error == "user_connected") {
			show_error("A player with that username is already playing in that game.");
		} else {
			show_error("There was a mysterious server error. Yell at Teddy to see if he'll fix it.");
		}
	}
}

function log(text) {
	console.log(text);
}

$(document).ready(function() {
	$("#join-controls form").submit(function(e) {
		console.log("clicked submit");

		e.preventDefault();
		socket.emit("join game", {
			"username":$("input#username").val(),
			"game":$("input#game").val()
		},
		join_callback);
		log("Sent join request.");
	});

	$("button#delete_all_users").click(function(e) {
		socket.emit("delete all");
	});

	$("button#show_all_users").click(function(e) {
		socket.emit("get users", 0, function(data) {
			update_player_table("#all_users_list table", data);
		});
	});

	$("#game-start form").submit(function(e) {
		e.preventDefault();
		socket.emit("start game", {
			gid:gid,
			options: {
				hand_size:$("#options #hand-size").val()
			}
		});
	});

	$("#game-start #options-toggle").click(event => {
		event.preventDefault();
		$("#game-start #options").toggleClass("hidden");
	});

	$(".prompt form").submit(function (e) {
		e.preventDefault();
		submit_prompt_card();
	});

	$(".choose-secret button").click(event => {
		choose_secret_card();
	});

	$("#guess-card button").click(event => {
		guess_card();
	});

	$("#reset-game button").click(event => {
		socket.emit("reset game", {
			gid:gid
		});
	});
	$("#shuffle-players").click(event => {
		socket.emit("shuffle players", {
			gid:gid
		});
	});


	socket.on("player join", update_players);
	socket.on("card update", update_cards);
	socket.on("start game", game_started);

	socket.on("reveal guess", end_turn);

	socket.on("round prompt", start_prompt_round);
	socket.on("round guess", start_guess_round);

	socket.on("other prompt", other_player_prompt);
	socket.on("other secret", other_player_secret);
	socket.on("other guess", other_player_guess);

	socket.on("reset game", reset_game);
});