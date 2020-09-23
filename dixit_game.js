
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

function join_callback(res) {
	if(res["response"] == "success") {
		clear_error();
		user = res["username"];
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
			$("#players ul").append("<li>"+user.name+"</li>");
		});
	});
}

function setup_game() {
	$("#room_text").text("Playing in game: " + game);
	$("#gameboard").removeClass("hidden");
	$("#join_controls").addClass("hidden");

	game_state = "pregame";

	
}

function game_started() {
	$("button#start_game").addClass("hidden");

	game_state = "player_prompt";
}

function start_round(turn_data) {
	current_turn = turn_data.uid;
	if(uid == turn_data.uid) {
		$("#prompt").removeClass("hidden");
	}
	$("#turn_text").removeClass("hidden");
	$("#turn_text").text("Current turn: " + turn_data.username);
}

function hand_update(data) {
	console.log("got hand update");
	console.log(data.cards);
	$("#hand ul li").remove();
	data.cards.forEach(function(card) {
		if(card.uid == uid) {
			console.log("card "+ card.uid);
			$("#hand ul").append("<li cid='"+ card.cid + "'><a href='#'>"+card.filename+"</a></li>");
		}
	});
}

function get_prompt(data) {
	game_state = "choose_secret";
	if(uid != current_turn) {
		$("#prompt_text").text(data.prompt);
		$(".choose-secret").removeClass("hidden");
	} else {
		notify("Wait for the other players to choose their cards.");
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
		socket.emit("prompt", {
			prompt:$("#prompt_inp").val(),
			uid:uid,
			gid:gid
		}, function (data) {
			$("#prompt").addClass("hidden");
		});
	});

	socket.on("player join", update_players);
	socket.on("user hands", hand_update);
	socket.on("turn", start_round);
	socket.on("start game", game_started);
	socket.on("prompt", get_prompt);
});