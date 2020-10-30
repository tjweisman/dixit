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
			if(user.state != 'left') {
				$("#players table").append("<tr class='player" + user_class + "'uid='" + user.uid + "'><td>"+user.name+"</td><td class='score'>" + user.score + "</td></tr>");
			}
			if(user.state == 'wait') {
				player_element(user.uid).addClass("waiting-move");
			}
			if(game_state == "guess" && user.guess != null) {
				other_player_guess({uid:user.uid, cid:user.guess});
			}
		});
		log(on_updated);
		if(on_updated && typeof on_updated == "function") {
			on_updated();
		}
	});
}

function update_player_scores() {
	for (let [uid, player] of players) {
		if(player.state != "left") {
			$("#players tr[uid=" + uid + "] td.score").text(player.score);
		}
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
			$("#hand ul").append("<li cid=" + card.cid +"><a href='#' class='card-link'>" + 
				"<img src='" + card_dir + "/" + card.filename+"' title='artist: " + card.artist +"' /></a></li>");
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
	clear_selection();
	for (let [cid, card] of played_cards) {
		card_elt = $("#revealed-cards li[cid='" + cid + "'] .card-owner");
		if(players.has(card.uid)) {
			card_elt.text(players.get(card.uid).name);
		} else {
			//this shouldn't occur but whatever
			card_elt.text("[??]");
		}
		
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

function artist_by_cid(cid) {
	let title = $("li[cid=" + cid + "] img").attr("title");
	return title.substring(8);
}

function player_element(p_uid) {
	return $(".player[uid=" + p_uid + "]");
}

function hide_interactives() {
	$(".prompt").addClass("hidden");
	$(".hint").addClass("hidden");
	$(".choose-secret").addClass("hidden");
	$("#guess-card").addClass("hidden");
	$("#turn_text").addClass("hidden");
}

function set_default_visibility() {
	hide_interactives();

	$("#game-end").addClass("hidden");
	$(".card-list li").remove();
	$("#cards-remaining").text("");

	$("#game-start").removeClass("hidden");

}


function setup_game(res) {
	username = res.username;
	game = res.game;
	uid = res.uid;
	gid = res.gid;

	if(res.session_id) {
		localStorage.setItem("dixit_id", res.session_id);
	}

	let game_data = res.game_data;

	game_state = game_data.state;
	current_turn = game_data.turn;

	set_default_visibility();

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
	$("#card-viewer img").attr("title", $(event.target).attr("title"));
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
	set_default_visibility();
	update_players();
}

function game_started(data) {
	log("game start message received");
	$("#game-start").addClass("hidden");
}

function start_prompt_round(turn_data) {
	log("begin new round. state: player_prompt");
	log("turn_data:");
	log(turn_data);

	clear_selection();
	clear_notify();

	$("#guess-card").addClass("hidden");

	game_state = "prompt";
	$("#hand a").removeClass("active");
	current_turn = turn_data.uid;
	$(".player").removeClass("waiting-move");
	player_element(current_turn).addClass("waiting-move");
	if(uid == turn_data.uid) {
		$(".prompt").removeClass("hidden");
	} else {
		$(".prompt").addClass("hidden");
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
			"<img src='" + played_cards.get(cid).filename + "' title='artist: " + 
			played_cards.get(cid).artist+ "' /></a><div class='guess-info'>" +
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

function end_turn(data) {
	log("end of turn, updating player scores");
	for(let player of data) {
		log("updating player " + player.name + " to have score " + player.score);
		players.get(player.uid).score = player.score;
	}
	update_player_scores();
	reveal_guesses();
}

function end_game(data) {
	hide_interactives();
	$("#game-end").removeClass("hidden");

	if(data.winners.length > 1) {
		$("#winner-announce").text("Winners: ");
		$("#win-text").text("The game has ended. It's a tie!");
	} else {
		$("#winner-announce").text("Winner: ");
		$("#win-text").text("The game has ended!");
	}
	
	let winnerText = data.winners[0].name;

	for(let i = 1;i<data.winners.length;i++) {
		winnerText += ", " + data.winners[i].name;
	}

	$("#winner-names").text(winnerText);

	$(".prompt").addClass("hidden");
	$(".guess").addClass("hidden");
}

function close_game() {
	$("#gameboard").addClass("hidden");
	$("#join-controls").removeClass("hidden");
	clear_error();
	clear_notify();
}

function handle_error(data) {
	clear_error();
	if(data.type == "SQL") {
		error_text("A generic SQL error occured. Tell Teddy to check the Heroku logs and he might be able to figure out the problem.");
	}
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
		username: username,
		artist: artist_by_cid(selected_card),
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
			artist: artist_by_cid(selected_card),
			uid:uid,
			turn:current_turn,
			gid:gid,
			num_players:players.size
		});

		remove_from_hand(selected_card);
		$(".choose-secret").addClass("hidden");
		clear_selection();
	}
}

function guess_card() {
	//TODO: validate selected card
	socket.emit("guess card", {
		cid:selected_card,
		uid:uid,
		gid:gid
	});
	$("#guess-card").addClass("hidden");
	clear_selection();
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

	played_cards.set(data.cid, {uid:data.uid, filename:data.filename, artist:data.artist});
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
		} else if(res.error == "game_ended") {
			show_error("That game has ended and isn't accepting new players.");
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
			username:$("input#username").val(),
			game:$("input#game").val(),
			session_id:localStorage.getItem("dixit_id")
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
	$("button#delete_local_data").click((event) => {
		localStorage.clear();
	});

	$("#game-start form").submit(function(e) {
		e.preventDefault();
		socket.emit("start game", {
			gid:gid,
			options: {
				hand_size:$("#options #hand-size").val(),
				equal_hands:$("#options #equal-hands").is(":checked"),
				deck_limit:$("#options #deck-limit").val(),
				deck_limit_on:$("#options #deck-limit-on").is(":checked")
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

	$("button.reset-game").click(event => {
		socket.emit("reset game", {
			gid:gid
		});
	});

	$("button.end-game").click(event => {
		socket.emit("delete game", {
			gid:gid
		});
	});

	$("#shuffle-players").click(event => {
		socket.emit("shuffle players", {
			gid:gid
		});
	});
	$("a#about").click((event) => {
		event.preventDefault();
		$("#about-content").toggleClass("hidden");
	});
	$("button.leave-game").click((event) => {
		socket.emit("leave game", {
			uid:uid,
			gid:gid
		});
		close_game();
	});


	socket.on("player update", update_players);
	socket.on("card update", update_cards);
	socket.on("start game", game_started);

	socket.on("end turn", end_turn);

	socket.on("round prompt", start_prompt_round);
	socket.on("round guess", start_guess_round);

	socket.on("other prompt", other_player_prompt);
	socket.on("other secret", other_player_secret);
	socket.on("other guess", other_player_guess);

	socket.on("reset game", reset_game);
	socket.on("end game", end_game);

	socket.on("server error", handle_error);

	socket.on("delete game", close_game);

});