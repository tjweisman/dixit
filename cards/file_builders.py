import re
import os
import shutil

SCRIPT_DIR = "/home/teddy/projects/dixit/cards"
FRONTEND_DIR = "/home/teddy/projects/dixit/client"
BACKEND_DIR = "/home/teddy/projects/dixit/server"

FRONTEND_CARD_PATH = "cards"
SQL_FILENAME = "insert_cards.sql"
SQL_OUTPUT = os.path.join(SCRIPT_DIR, SQL_FILENAME)

TEMPLATE_FILENAME = "cards_template.html"
HTML_OUTPUT = "index.html"

BUILDER_TEMPLATE = "builder_template.html"
BUILDER_OUTPUT = "deck_builder.html"

def build_sql_file(cards):
    output_lines = []
    for dirname, dir_cards in cards.items():
        output_lines += ["('{}', '{}', '{}')".format(output_filename, dirname, date_added)
                        for output_filename, date_added in dir_cards]

    with open(SQL_OUTPUT, 'w') as sql_output:
        sql_output.write("INSERT INTO default_cards(filename, artist, date_added) VALUES\n")
        sql_output.write(",\n".join(output_lines))
        sql_output.write("\nON CONFLICT DO NOTHING;")

def card_html(card, global_indices, artist):
    output_filename, _ = card
    global_index = global_indices[output_filename]
    return ("<li gid='{1}' artist='{2}'><a href='{0}'><img src='{0}' /></a>"
            "<div class='img-title'>{0}</div></li>\n").format(output_filename,
                                                              global_index,
                                                              artist)

def artist_header(artist_name, num_cards):
    return ("<div id='{0}-cards' class='infobox artist-section'><div class='artist-titlebox'>"
            "<h3 class='artist-title'><a href='' id='{0}'>{0}"
            " (<span class='card-counter'>0/{1}</span>)</a>"
            "</h3> <div class='select-buttons'>"
            "<button class='select-all'>Select all</button>"
            "<button class='deselect-all'>Deselect all</button></div></div>"
            "<ul class='card-hide card-list'>\n").format(
                artist_name, num_cards)

def artist_close(artist_name):
    return "</ul></div>\n"

def build_card_index(cards, global_indices):
    with open(os.path.join(SCRIPT_DIR, TEMPLATE_FILENAME), "r") as template:
        with open(os.path.join(SCRIPT_DIR, HTML_OUTPUT), "w") as html_output:
            for line in template:
                if re.match(r"\s*\$\{card_list\}", line):
                    for dirname, dir_cards in cards.items():
                        for card in dir_cards:
                            html_output.write(card_html(card, global_indices, dirname))
                else:
                    html_output.write(line)

def build_card_customizer(cards, global_indices):
    with open(os.path.join(SCRIPT_DIR, BUILDER_TEMPLATE), "r") as template:
        with open(os.path.join(SCRIPT_DIR, BUILDER_OUTPUT), "w") as output:
            for line in template:
                if re.match(r"\s*\$\{cards\}", line):
                    for dirname, dir_cards in cards.items():

                        output.write(artist_header(dirname, len(dir_cards)))

                        for card in dir_cards:
                            output.write(card_html(card, global_indices, dirname))

                        output.write(artist_close(dirname))
                else:
                    output.write(line)

def build_card_files(card_data, global_indices):
    build_sql_file(card_data)
    shutil.copyfile(os.path.join(SCRIPT_DIR, SQL_FILENAME),
                    os.path.join(BACKEND_DIR, SQL_FILENAME))

    build_card_index(card_data, global_indices)
    shutil.copyfile(os.path.join(SCRIPT_DIR, HTML_OUTPUT),
                    os.path.join(FRONTEND_DIR, FRONTEND_CARD_PATH, HTML_OUTPUT))

    build_card_customizer(card_data, global_indices)
    shutil.copyfile(os.path.join(SCRIPT_DIR, BUILDER_OUTPUT),
                    os.path.join(FRONTEND_DIR, FRONTEND_CARD_PATH, BUILDER_OUTPUT))
