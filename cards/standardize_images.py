#! /usr/bin/env python

import sys
import re
import os
import subprocess
import shutil
import tempfile

from collections import defaultdict

from natsort import natsorted

SCRIPT_DIR = "/home/teddy/projects/dixit/cards"
FRONTEND_DIR = "/home/teddy/projects/dixit/client"
BACKEND_DIR = "/home/teddy/projects/dixit/server"

FRONTEND_CARD_PATH = "cards"
SQL_FILENAME = "insert_cards.sql"
SQL_OUTPUT = os.path.join(SCRIPT_DIR, SQL_FILENAME)

TEMPLATE_FILENAME = "cards_template.html"
HTML_OUTPUT = "index.html"

OUTPUT_SIZE = "350x560^"
TMP_GIF_NAME = "tmp.gif"

PROCESSED_CARDS_LIST = "processed"
IMAGE_DIRECTORY = "src_images"

DEFAULT_VERBOSITY = 1
PROG_NAME = "standardize_images"

def log(text, verbosity=1):
    if verbosity <= DEFAULT_VERBOSITY:
        print("{}: {}".format(PROG_NAME, text))

def change_ext(filename, new_ext):
    """return a new filename, with the extension changed.
    """
    return re.sub(r"\.\w+$", new_ext, filename)

def map_img_extensions(extension):
    #keep gif filetype, otherwise convert to png
    if extension == ".gif":
        return ".gif"

    return ".png"

def preprocess_gif(tmp_dir, input_path):
    preprocess_output = os.path.join(tmp_dir, "tmp.gif")
    subprocess.run([
        "magick",
        input_path,
        "-coalesce",
        preprocess_output
    ])
    return preprocess_output

def get_processed_path():
    return os.path.join(SCRIPT_DIR, PROCESSED_CARDS_LIST)

def load_processed():
    process_path = get_processed_path()
    try:
        processed_dict = {}
        with open(process_path, 'r') as processed:
            for line in processed:
                entries = re.split(r",\s*", line.strip())
                if len(entries) != 2:
                    log("Malformed processed file entry: {}".format(line))
                    continue
                inp_name, out_name = entries
                processed_dict[inp_name] = out_name
            return processed_dict
    except FileNotFoundError:
        log("No list of processed files found, skipping.")

def build_indices(processed):
    if not processed:
        log("Not building index dict since there are no processed files",
            verbosity=2)
        return

    indices = defaultdict(int)
    for key, value in processed.items():
        base_filename = os.path.basename(value)
        match = re.match(r"[^_]+(?=_)", base_filename)

        if not match:
            log("unexpected filename format found: {}".format(base_filename))
            continue

        file_prefix = match.group()
        indices[file_prefix] += 1

    return indices

def run_standardize(directory, processed_files=None,
                    processed_handle=None, file_indices=None):

    if not processed_handle:
        log("No handle provided for processed files! The script will not"
            "remember which files were updated on this run.")

    output_directory = os.path.join(FRONTEND_DIR, FRONTEND_CARD_PATH)
    dir_key = os.path.basename(directory)

    if file_indices and dir_key in file_indices:
        index = file_indices[dir_key]
    else:
        index = 0

    card_data = []

    #create a temporary directory for preprocessing gifs
    processing_dir = tempfile.TemporaryDirectory()

    for base, dirs, files in os.walk(directory):
        dirs.sort()
        sort_files = natsorted(files)
        for filename in sort_files:
            _, extension = os.path.splitext(filename)
            new_extension = map_img_extensions(extension)

            output_filename = "{}_card{:02}{}".format(dir_key, index, new_extension)
            input_path = os.path.join(base, filename)
            output_path = os.path.join(output_directory, output_filename)

            processed_key = input_path
            if not processed_files or processed_key not in processed_files:
                if extension == ".gif":
                    log("Preprocessing gif file: {}.".format(input_path))
                    input_path = preprocess_gif(processing_dir.name, input_path)
                    log("Produced temporary gif file: {}".format(input_path))

                log("Processing file: {}. Output: {}".format(input_path, output_path))

                subprocess.run(["magick",
                                input_path,
                                "-resize",
                                OUTPUT_SIZE,
                                "-layers",
                                "optimize",
                                output_path])

                if processed_handle:
                    processed_handle.write(processed_key + ", " + output_filename + "\n")

                index += 1
            else:
                log("Skipping file: {}".format(input_path))
                output_filename = processed_files[processed_key]

            card_data.append((output_filename, dir_key))

    processing_dir.cleanup()

    return card_data

def build_sql_file(cards):

    output_lines = ["('{}', '{}')".format(output_filename, artist)
                    for output_filename, artist in cards]
    with open(SQL_OUTPUT, 'w') as sql_output:
        sql_output.write("INSERT INTO default_cards(filename, artist) VALUES\n")
        sql_output.write(",\n".join(output_lines))
        sql_output.write("\nON CONFLICT DO NOTHING;")

def card_html(card):
    output_filename, artist = card
    return ("<li><a href='{0}'><img src='{0}' /></a>"
            "<div class='img-title'>{0}</div></li>\n").format(output_filename)


def build_card_index(cards):
    with open(os.path.join(SCRIPT_DIR, TEMPLATE_FILENAME), "r") as template:
        with open(os.path.join(SCRIPT_DIR, HTML_OUTPUT), "w") as html_output:
            for line in template:
                if re.match(r"\s*\$\{card_list\}", line):
                    for card in cards:
                        html_output.write(card_html(card))
                else:
                    html_output.write(line)


def process_dirs(directories):
    processed_files = load_processed()
    indices = build_indices(processed_files)
    card_data = []

    with open(get_processed_path(), 'a') as processed_handle:
        for dirname in directories:
            addl_cards = run_standardize(
                dirname,
                processed_files, processed_handle,
                file_indices=indices)

            card_data += addl_cards

    build_sql_file(card_data)
    shutil.copyfile(os.path.join(SCRIPT_DIR, SQL_FILENAME),
                    os.path.join(BACKEND_DIR, SQL_FILENAME))

    build_card_index(card_data)
    shutil.copyfile(os.path.join(SCRIPT_DIR, HTML_OUTPUT),
                    os.path.join(FRONTEND_DIR, FRONTEND_CARD_PATH, HTML_OUTPUT))


def main():
    if len(sys.argv) > 1:
        directories = sys.argv[1:]
    else:
        src_dirs = os.path.join(SCRIPT_DIR, IMAGE_DIRECTORY)
        directories = [os.path.join(src_dirs, im_dir)
                       for im_dir in natsorted(os.listdir(src_dirs))]

    process_dirs(directories)

if __name__ == "__main__":
    main()
