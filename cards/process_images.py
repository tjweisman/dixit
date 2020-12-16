#! /usr/bin/env python

import sys
import re
import os
import subprocess
import shutil
import tempfile

from datetime import date
from collections import defaultdict

from natsort import natsorted

from file_builders import build_card_files

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
                if len(entries) != 3:
                    log("Malformed processed file entry: {}".format(line))
                    continue
                inp_name, out_name, date = entries
                processed_dict[inp_name] = {"name":out_name, "date":date}
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
        base_filename = os.path.basename(value["name"])
        match = re.match(r"[^_]+(?=_)", base_filename)

        if not match:
            log("unexpected filename format found: {}".format(base_filename))
            continue

        file_prefix = match.group()
        indices[file_prefix] += 1

    return indices

def make_sorted_card_list(card_data):
    card_list = []
    for _, dir_cards in card_data:
        card_list += [(date_added, filename)
                      for filename, date_added in dir_cards]

    return sorted(cardlist)

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

                date_added = date.today().isoformat()

                subprocess.run(["magick",
                                input_path,
                                "-resize",
                                OUTPUT_SIZE,
                                "-layers",
                                "optimize",
                                output_path])

                if processed_handle:
                    processed_handle.write("{}, {}, {}\n".format(processed_key,
                                                                 output_filename,
                                                                 date_added))


                index += 1
            else:
                log("Skipping file: {}".format(input_path))
                output_filename = processed_files[processed_key]["name"]
                date_added = processed_files[processed_key]["date"]

            card_data.append((output_filename, date_added))

    processing_dir.cleanup()

    return card_data


def process_dirs(directories):
    processed_files = load_processed()
    indices = build_indices(processed_files)
    card_data = {}

    with open(get_processed_path(), 'a') as processed_handle:
        for dirname in directories:
            dir_cards = run_standardize(
                dirname,
                processed_files, processed_handle,
                file_indices=indices)

            card_data[os.path.basename(dirname)] = dir_cards

    build_card_files(card_data)


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
