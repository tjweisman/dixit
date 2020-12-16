function get_hex_string() {
	let num_bytes = Math.ceil($(".card-list li").length / 8);
	let byte_array = new Array(num_bytes).fill(0);
	$(".card-list li").each((index, element) => {
		if($(element).hasClass("selected")) {
      let card_index = $(element).attr("gid");
			let byte_index = Math.floor(card_index / 8);
			let entry = byte_array[byte_index];
			byte_array[byte_index] = entry | (1 << (7 - card_index % 8));
		}
	});

	//shamelessly stolen from the internet because why the eff isn't this already built in to javascript
	hex_string = Array.from(byte_array, function(byte) {
    	return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  	}).join('');

  return hex_string;
}

function index_present(hex_code, index) {
let hex_index = Math.floor(index / 4);
  
  if(hex_index >= hex_code.length) {
    return false;
  }

  let halfbyte = "0x" + hex_code[Math.floor(index / 4)];
  console.log(halfbyte);
  return parseInt(halfbyte) & (1 << (3 - index % 4));
}

function artist_toggle(event) {
  event.preventDefault();
  let artist = $(event.target).closest("a").attr("id");

  $("#" + artist + "-cards ul").toggleClass("card-hide");

}

function image_hover_listener(event) {
  $("#card-viewer img").attr("src", $(event.target).attr("src"));
  $("#card-viewer img").attr("title", $(event.target).attr("title"));
}

function image_click_listener(event) {
  event.preventDefault();
  $(event.target).closest("li").toggleClass("selected");

  let artist = $(event.target).closest("li").attr("artist");
  update_artist_count(artist + "-cards");

  update_deck_code();
}

function artist_select_all(event) {
  let section = $(event.target).closest(".artist-section");
  section.find(".card-list li").addClass("selected");
  update_artist_count(section.attr("id"));

  update_deck_code();
}

function artist_deselect_all(event) {
  let section = $(event.target).closest(".artist-section");
  section.find(".card-list li").removeClass("selected");
  console.log(section.attr("id"));
  update_artist_count(section.attr("id"));

  update_deck_code();
}

function select_all() {
  $(".card-list li").addClass("selected");

  $(".artist-section").each((index, element) => {
    update_artist_count($(element).attr("id"));
  });

  update_deck_code();
}

function deselect_all() {
  $(".card-list li").removeClass("selected");

  $(".artist-section").each((index, element) => {
    update_artist_count($(element).attr("id"));
  });

  update_deck_code();
}


function expand_all_artists() {
  $(".artist-section ul").removeClass("card-hide");
}

function collapse_all_artists() {
  $(".artist-section ul").addClass("card-hide");
}

function update_artist_count(artist_id) {
  let num_artist_cards = $("#" + artist_id + " li").length;
  let num_artist_selected = $("#" + artist_id + " li.selected").length;

  $("#" + artist_id + " .card-counter").text(num_artist_selected + "/" + num_artist_cards);
}

function update_deck_code() {
  $("#hex-code").val(get_hex_string());
}

function deck_code_changed(event) {
  let code = $(event.target).closest("textarea").val();
  $(".card-list li").each((index, element) => {
    if(index_present(code, $(element).attr("gid"))) {
      $(element).addClass("selected");
    } else {
      $(element).removeClass("selected");
    }
  });

  $(".artist-section").each((index, element) => {
    update_artist_count($(element).attr("id"));
  });
}

$(document).ready(() => {
	//$("button#compute").click(to_binary_array);

  $(".artist-title a").click(artist_toggle);

  $(".card-list img").hover(image_hover_listener);
  $(".card-list a").click(image_click_listener);

  $("button#expand-all").click(expand_all_artists);
  $("button#collapse-all").click(collapse_all_artists);

  $("button.select-all").click(artist_select_all);
  $("button.deselect-all").click(artist_deselect_all);

  $("button#select-all").click(select_all);
  $("button#deselect-all").click(deselect_all);

  $("#hex-code").change(deck_code_changed);
});