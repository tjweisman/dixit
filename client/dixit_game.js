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
var select_allowed;

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

function update_artists(artist_list) {
	$("#deck-items li").remove();
	for(let artist of artist_list) {
		$("#deck-items").append(
			"<li><input type='checkbox' id='" + artist.artist + "-include' value = '" 
			+ artist.artist + "' checked>" + "<label for='" + artist.artist + 
			"-include'>" + artist.artist + " (" + artist.count + ")</label></li>");
	}
	$("#deck-items").change(form_change_event);
}

function get_winners() {
	if(players.size == 0) {
		return;
	}
	let player_array = [...players.entries()].map(pair => pair[1]);
	let sorted_players = player_array.sort((player1, player2) => {
		return player2.score - player1.score;
	});
	log("sorted players:");
	log(sorted_players);
	return sorted_players.filter((player) => {
		return player.score == sorted_players[0].score;
	});
}

function update_players(on_updated) {
	log("Received signal to update player list");
	socket.emit("get users", gid, function(data) {
		log("Received updated list of users.");
		sorted_users = data.sort((user1, user2) => {
			return user1.turn_order - user2.turn_order;
		});

		$("#players tr").remove();
		players = new Map();
		player_guesses = new Map();
		for (let user of sorted_users) {
			players.set(user.uid, user);
			log(user);
			user_class = "";
			if(user.uid == uid) {
				user_class += " local-uid";
			}
			if(user.state != 'left') {
				$("#players table").append("<tr class='player" + user_class + "'uid='" + user.uid + 
					"'><td class='winning'></td><td class='name'>" +user.name+"</td><td class='score'>" + user.score + "</td></tr>");
			}
			if(user.state == 'wait') {
				player_element(user.uid).addClass("waiting-move");
			}
			if(game_state == "guess" && user.guess != null) {
				other_player_guess({uid:user.uid, cid:user.guess});
			}
		}
		update_winners();
		log(on_updated);
		if(on_updated && typeof on_updated == "function") {
			on_updated();
		}
	});
}

function update_winners() {
	log("updating winners");
	let winning_players = get_winners();
	log("winning players:");
	log(winning_players);
	
	$("#players td.winning").text("");

	if(winning_players.length < players.size) {
		for(let player of winning_players) {
			log("#players tr[uid=" + player.uid + "] td.winning");
			$("#players tr[uid=" + player.uid + "] td.winning").text("★");
		}
	}
}

function match_remote_form(data) {
	let form_selector = "form#" + data.form_id;
	for (let input_elt of data.input_elements) {
		let local_elt = $(form_selector + " #"+input_elt.id);
		if(input_elt.type == "checkbox") {
			local_elt.prop("checked", input_elt.checked);	
		} else {
			local_elt.val(input_elt.val);
		}
	}
}

function broadcast_form_status(form_id) {
	let form_elements = new Array();
	$("form#"+form_id).find("input, textarea").each((index, element) => {
		form_elements.push({
			id:$(element).attr("id"),
			type:$(element).attr("type"),
			checked:$(element).is(":checked"),
			val:$(element).val(),
			element:element.nodeName
		});
	});
	socket.emit("form sync", {
		gid:gid,
		form_id:form_id,
		input_elements: form_elements
	});
}

function form_change_event(event) {
	console.log("Form changed!");
	let form = $(event.target).closest("form");

	let target_obj = $(event.target);
	let change_data = {
		id:target_obj.attr("id"),
		type:target_obj.attr("type"),
		checked:target_obj.is(":checked"),
		val:target_obj.val(),
		element:event.target.nodeName
	};
	socket.emit("form sync", {
		gid:gid,
		form_id:form.attr("id"), 
		input_elements: [change_data]});
}

function update_player_scores() {
	for (let [uid, player] of players) {
		if(player.state != "left") {
			$("#players tr[uid=" + uid + "] td.score").text(player.score);
		}
	}
	update_winners();
}

function update_storyteller_text() {
	$("#turn_text").removeClass("hidden");

	if(players.has(current_turn)) {
		$("#turn_text").text("Storyteller: " + players.get(current_turn).name);	
	}
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

	log("remaining cards: ");
	log(data.remaining);
	$("#cards-remaining").text("Cards in deck: " + data.remaining);

	register_card_listeners();

	if(game_state == "guess") {
		make_guess_cards();
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

function clear_load_status() {
	$(".loading").addClass("hidden");
	$(".load").removeClass("hidden");
}

function set_default_visibility() {
	hide_interactives();
	clear_load_status();
	clear_notify();
	clear_error();

	$("#game-end").addClass("hidden");
	$(".card-list li").remove();
	$("#cards-remaining").text("");
	$("#win-score-display").text("");
	$("#round-number-display").text("");

	$("#game-start").removeClass("hidden");

}

function update_game_data(game_data) {
	if(game_data.round_limit > 0) {
		$("#round-number-display").text("Round: " + (game_data.round_number + 1) + "/" + game_data.round_limit);	
	} else {
		$("#round-number-display").text("Round " + (game_data.round_number + 1));
	}
	
	if(game_data.win_score > 0) {
		$("#win-score-display").text("First to " + game_data.win_score + " points wins");
	}
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

	invite_link = window.location.href.split('?')[0] + "?room=" + encodeURIComponent(game);

	$("#invite-link").val(invite_link);
	$("#gameboard").removeClass("hidden");
	$("#join-controls").addClass("hidden");

	socket.emit("get artists", 
		{gid:gid},
		update_artists
	);

	played_cards = new Map();
	players = new Map();

	if(game_state == 'prompt') {
			start_prompt_round({
				uid:game_data.turn,
				game_data:game_data
			});
	} else if(game_state == 'secret') {
		start_secret_round({
			prompt:game_data.prompt
		});
	} else if(game_state == 'guess') {
		reset_player_guesses();
	}
	update_players(() => {
		if(game_state != 'pregame') {
			game_started(game_data);
			update_storyteller_text();

			socket.emit("get cards", {
				gid:gid
			});
		} else {
			socket.emit("form request", {
				gid:gid,
				form_id:"options-form"
			});
		}
	});
}

function card_listener(event, parent) {
	event.preventDefault();
	if(!select_allowed) {
		return;
	}
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
	//fire the hover event too (for mobile users)
	image_hover_listener(event);
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
	log(data);
	update_game_data(data);
}

function start_prompt_round(turn_data) {
	log("begin new round. state: player_prompt");
	log("turn_data:");
	log(turn_data);

	clear_selection();
	select_allowed = true;
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
	update_game_data(turn_data.game_data);
}

function start_secret_round(data) {
	game_state = "secret";
	log("game state changed to choose_secret");
	clear_selection();
	select_allowed = true;
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

function make_guess_cards(order) {
	sorted_cids = Array.from(played_cards.keys()).sort();
	log("sorted cids:");
	log(sorted_cids);

	if(order == undefined) {
		log("Inferring order from cards");
		order = new Array(sorted_cids.length);
		for(let i = 0;i < sorted_cids.length;i++) {
			order[played_cards.get(sorted_cids[i]).display_order] = i;
		}
	}


	log(order);

	order.forEach(index => {
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
}

function reset_player_guesses() {
	clear_selection();
	select_allowed = true;
	clear_notify();

	player_guesses = new Map();
	set_players_waiting(current_turn);

	if(uid == current_turn) {
		$("#guess-card").addClass("hidden");
		notify("Wait for the other players to make their guesses.");
	} else {
		$("#guess-card").removeClass("hidden");
	}
}

function start_guess_round(data) {
	game_state = "guess";
	log("game state changed to guesses");
	
	make_guess_cards(data.order);
	reset_player_guesses();
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
	clear_load_status();
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
		select_allowed = false;
	}
}

function guess_card() {
	//TODO: validate selected card
	socket.emit("guess card", {
		cid:selected_card,
		uid:uid,
		gid:gid
	});
	
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

	played_cards.set(data.cid, {
		uid:data.uid, 
		filename:data.filename, 
		artist:data.artist,
		display_order:data.display_order});
}

function other_player_guess(data) {
	if(game_state == 'guess') {
		player_element(data.uid).removeClass("waiting-move");
	}
	player_guesses.set(data.uid, {cid:data.cid});
	if(data.uid == uid) {
		$("#guess-card").addClass("hidden");
		select_allowed = false;	
	}
}

//callbacks
function join_callback(res) {
	clear_load_status();
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
	let url_params = new URLSearchParams(window.location.search);
	room = url_params.get('room');
	if(room != null) {
		$("input#game").val(decodeURIComponent(room));
	}

	$("#copy-invite-link").click((event) => {
		event.preventDefault();
		$("#invite-link").focus();
		let linkDOM = $("#invite-link")[0];
		linkDOM.setSelectionRange(0, linkDOM.value.length);
		document.execCommand("copy");
	})

	$("#join-controls form").submit(function(e) {
		console.log("clicked submit");

		e.preventDefault();

		$("#join-controls input[type=submit]").addClass("hidden");
		$("#join-controls .loading").removeClass("hidden");

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

	$("#game-start form input, textarea").on('input', form_change_event);

	$("#game-start form").submit(function(e) {
		e.preventDefault();
		let included_artists = new Array();
		$("#deck-filter input:checked").each((index, element) => {
			included_artists.push($(element).val());
			console.log($(element).id);
		});
		socket.emit("start game", {
			gid:gid,
			options: {
				hand_size:$("#options #hand-size").val(),
				equal_hands:$("#options #equal-hands").is(":checked"),
				deck_limit:$("#options #deck-limit").val(),
				deck_limit_on:$("#options #deck-limit-on").is(":checked"),
				win_score_on:$("#options #win-score-on").is(":checked"),
				win_score:$("#options #win-score").val(),
				round_limit_on:$("#options #round-limit-on").is(":checked"),
				round_limit:$("#options #round-limit").val(),
				artists:included_artists,
				custom_deck_on:$("#options #custom-deck-on").is(":checked"),
				custom_deck:$("#options #custom-deck").val()
			}
		});
	});

	$("#game-start #options-toggle").click(event => {
		event.preventDefault();
		$("#game-start #options").toggleClass("hidden");
	});

	$("#options #deck-filter-toggle").click(event => {
		event.preventDefault();
		$("#deck-filter").toggleClass("hidden");
	});

	$("#select-all-artists").click(event => {
		$("#deck-filter ul input").prop("checked", true);
	});

	$("#deselect-all-artists").click(event => {
		$("#deck-filter ul input").prop("checked", false);
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
	$("a#toggle-infobox").click((event) => {
		event.preventDefault();
		$(".infobox-content").toggleClass("hidden");
		$("#info-container").toggleClass("info-container-show");
		$("#info-container").toggleClass("info-container-hide");
		$("a#toggle-infobox").toggleClass("small-toggle-hide");

		if($("a#toggle-infobox").text() == "▶") {
			$("a#toggle-infobox").text("▼");
		} else {
			$("a#toggle-infobox").text("▶");
		}
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

	socket.on("form request", broadcast_form_status);
	socket.on("form sync", match_remote_form);

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