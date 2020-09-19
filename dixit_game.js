
//const SOCKETIO_URL = "https://hulu-sync.herokuapp.com/";
const SOCKETIO_URL = "http://localhost:3000";

const connectionOptions = {
		"force new connection": true,
		"transports": ["websocket"]
	};

var socket = io.connect(SOCKETIO_URL, connectionOptions);
var username;
var room;

function join_callback(res) {
	if(res["response"] == "success") {
		clear_error();
		user = res["username"];
		room = res["room"];
		setup_game();
	} else if(res["response"] == "error") {
		if(res["error"] == "user_in_room") {
			show_error("There is already a user with the name '"+
				res["username"] + "' in the room '" + res["room"] + "'");
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

function update_player_list(list, data) {
	$(list + " li").remove();
	data.forEach(function(user) {
		$(list).append("<li>"+user.name+"</li>");
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

function get_players(room) {

}

function setup_game() {
	$("#room_text").text("Playing in room " + room);
	$("#gameboard").removeClass("hidden");
	$("#join_controls").addClass("hidden");

	socket.emit("get users", "", function(data) {
			update_player_list("#players ul", data);
	});
}

$(document).ready(function() {
	$("form").submit(function(e) {
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
		socket.emit("get users", "", function(data) {
			update_player_table("#all_users_list table", data);
		});
	});

	$("button#start_game").click(function(e) {
		socket.emit("start game", room);
	});
});