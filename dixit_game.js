
//const SOCKETIO_URL = "https://hulu-sync.herokuapp.com/";
const SOCKETIO_URL = "http://localhost:3000";

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
var played_cards = [];



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

function update_players() {
	socket.emit("get users", gid, function(data) {
		players = data;
		$("#players ul li").remove();
		data.forEach(function(user) {
			$("#players ul").append("<li class='player' uid='" + user.uid + "'>"+user.name+"</li>");
		});
	});
}

function set_players_waiting(except) {
	$(".player").addClass("waiting-move");
	player_element(except).removeClass("waiting-move");
}

function remove_from_hand(cid) {
	$("#hand a[cid=" + cid + "]").parent().remove();
}

function filename_by_cid(cid) {
	return $("a.card-link[cid=" + cid + "]").text()
}

function player_element(p_uid) {
	return $(".player[uid=" + p_uid + "]");
}

function setup_game() {
	$("#room_text").text("Playing in game: " + game);
	$("#gameboard").removeClass("hidden");
	$("#join_controls").addClass("hidden");

	game_state = "pregame";

}

function card_listener(event, parent) {
	event.preventDefault();
	if((game_state == "player_prompt" && uid == current_turn) ||
		(game_state == "choose_secret" && uid != current_turn) ||
		(game_state == "guesses" && uid != current_turn)) {
		$(parent + " a").removeClass("active");
		$(parent + " a").addClass("inactive");

		selected_card = event.target.getAttribute("cid");
		$(event.target).addClass("active");
		$(event.target).removeClass("inactive");
	}
}

function register_card_listeners() {
	$("#hand a").click(event => {
		card_listener(event, "#hand");
	});
	$("#table a").click(event => {
		card_listener(event, "#table");
	});
}


//global game events

function hand_update(data) {
	console.log("got hand update");
	console.log(data.cards);

	$("#hand ul li").remove();
	data.cards.forEach(function(card) {
		if(card.uid == uid) {
			console.log("card "+ card.uid);
			$("#hand ul").append("<li><a href='#' class='card-link inactive' cid="+ card.cid + ">"+card.filename+"</a></li>");
		}
	});
	register_card_listeners();
}

function game_started(data) {
	$("button#start_game").addClass("hidden");
}

function start_prompt_round(turn_data) {
	selected_card = null;
	console.log(turn_data);
	game_state = "player_prompt";
	$("#hand a").removeClass("active");
	current_turn = turn_data.uid;
	$(".player").removeClass("waiting-move");
	player_element(current_turn).addClass("waiting-move");
	if(uid == turn_data.uid) {
		$("#prompt").removeClass("hidden");
	}
	$("#turn_text").removeClass("hidden");
	$("#turn_text").text("Current turn: " + turn_data.username);
}

function start_secret_round(data) {
	game_state = "choose_secret";
	set_players_waiting(current_turn);
	if(uid != current_turn) {
		$("#prompt_text").text(data.prompt);
		$(".choose-secret").removeClass("hidden");
	} else {
		notify("Wait for the other players to choose their cards.");
	}
	played_cards = new Array();
	played_cards.push({
		uid:data.uid,
		cid:data.cid,
		filename:data.filename
	});
	$("#unrevealed-cards li").remove();
	$("#unrevealed-cards").removeClass("hidden");
}

function start_guess_round(data) {
	game_state = "guesses";
	selected_card = null;
	set_players_waiting(current_turn);
	data.order.forEach(index => {
		$("#revealed-cards ul").append("<li><a href='#' class = 'inactive' cid=" + played_cards[index].cid + ">" + 
			played_cards[index].filename + "</a></li>");
	});
	register_card_listeners();
	$("#unrevealed-cards").addClass("hidden");
	$("#revealed-cards").removeClass("hidden");
	if(uid == current_turn) {
		$("#guess-card").addClass("hidden");
	} else {
		$("#guess-card").removeClass("hidden");
	}
}

//local player actions
function submit_prompt_card() {
	//TODO: validate card choice
	socket.emit("prompt", {
		prompt:$("#prompt_inp").val(),
		uid:uid,
		gid:gid,
		filename: filename_by_cid(selected_card),
		cid:selected_card
	}, function (data) {
		$("#prompt").addClass("hidden");
	});

	remove_from_hand(selected_card);
}

function choose_secret_card() {
	//TODO: get the image src attribute instead here and validate selected card.
	socket.emit("choose secret", {
		cid:selected_card,
		filename: filename_by_cid(selected_card),
		uid:uid,
		turn:current_turn,
		username:username,
		gid:gid,
		num_players:players.length
	});

	remove_from_hand(selected_card);
	$(".choose-secret button").addClass("hidden");
}

function guess_card() {
	//TODO: validate selected card
	socket.emit("guess card", {
		cid:selected_card,
		uid:uid,
		username:username,
		gid:gid
	});
	$("#guess-card").addClass("hidden");
}

//remote player actions
function other_player_secret(data) {
	player_element(data.uid).removeClass("waiting-move");

	$("#unrevealed-cards ul").append("<li>(" + data.username + ")</li>");
	played_cards.push({
		uid:data.uid,
		cid:data.cid,
		filename:data.filename
	});
}

function other_player_guess(data) {
	player_element(data.uid).removeClass("waiting-move");
}


//callbacks
function join_callback(res) {
	if(res["response"] == "success") {
		clear_error();
		username = res["username"];
		game = res["game"];
		uid = res["uid"];
		gid = res["gid"];
		setup_game();
	} else if(res["response"] == "error") {
		if(res["error"] == "user_in_game") {
			show_error("There is already a user with the name '"+
				res["username"] + "' in the game '" + res["game"] + "'");
		} else {
			show_error("There was a mysterious SQL error. Yell at Teddy to see if he'll fix it.");
		}
	}
}

$(document).ready(function() {
	$("#join_controls form").submit(function(e) {
		console.log("clicked submit");

		e.preventDefault();
		socket.emit("join game", {
			"username":$("input#username").val(),
			"game":$("input#game").val()
		},
		join_callback);
		console.log("Joined game.");
	});

	$("button#delete_all_users").click(function(e) {
		socket.emit("delete all");
	});

	$("button#show_all_users").click(function(e) {
		socket.emit("get users", 0, function(data) {
			update_player_table("#all_users_list table", data);
		});
	});

	$("button#start_game").click(function(e) {
		socket.emit("start game", gid);
	});

	$("#prompt form").submit(function (e) {
		e.preventDefault();
		submit_prompt_card();
	});

	$(".choose-secret button").click(event => {
		choose_secret_card();
	});

	$("#guess-card button").click(event => {
		guess_card();
	});

	

	socket.on("player join", update_players);
	socket.on("user hands", hand_update);
	socket.on("start game", game_started);

	socket.on("round prompt", start_prompt_round);
	socket.on("round secret", start_secret_round);
	socket.on("round guess", start_guess_round);

	socket.on("other secret", other_player_secret);
	socket.on("other guess", other_player_guess);
});