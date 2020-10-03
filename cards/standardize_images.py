#! /usr/bin/env python

import sys
import re
import os
import subprocess
import shutil

from collections import defaultdict

from natsort import natsorted

SCRIPT_DIR = "/home/teddy/projects/dixit/cards"
FRONTEND_DIR = "/home/teddy/projects/dixit/client"
BACKEND_DIR = "/home/teddy/projects/dixit/server"

FRONTEND_CARD_PATH = "cards"
SQL_FILENAME = "insert_cards.sql"
SQL_OUTPUT = os.path.join(SCRIPT_DIR, SQL_FILENAME)

OUTPUT_SIZE = "350x560^"

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
                    processed_handle=None, process_images=True,
                    file_indices=None):

    if not processed_handle:
        log("No handle provided for processed files! The script will not"
            "remember which files were updated on this run.")

    output_directory = os.path.join(FRONTEND_DIR, FRONTEND_CARD_PATH)
    dir_key = os.path.basename(directory)

    if file_indices and dir_key in file_indices:
        index = file_indices[dir_key]
    else:
        index = 0

    output_lines = []
    for base, dirs, files in os.walk(directory):
        sort_files = natsorted(files)
        for filename in sort_files:
            output_filename = "{}_card{:02}.png".format(dir_key, index)
            index += 1

            input_path = os.path.join(base, filename)
            output_path = os.path.join(output_directory, output_filename)

            if (process_images and
                (not processed_files or input_path not in processed_files)):

                log("Processing file: {}. Output: {}".format(input_path, output_path))

                subprocess.run(["magick",
                                input_path,
                                "-resize",
                                OUTPUT_SIZE,
                                output_path])

                if processed_handle:
                    processed_handle.write(input_path + ", " + output_filename + "\n")

            else:
                log("Skipping file: {}".format(input_path))
                output_filename = processed_files[input_path]

            output_lines.append("('{}', '{}')".format(output_filename, dir_key))

    return output_lines


def process_dirs(directories):
    processed_files = load_processed()
    indices = build_indices(processed_files)
    output_lines = []

    with open(get_processed_path(), 'a') as processed_handle:
        for dirname in directories:
            addl_files = run_standardize(
                dirname,
                processed_files, processed_handle,
                file_indices=indices)

            output_lines += addl_files

    with open(SQL_OUTPUT, 'w') as sql_output:
        sql_output.write("INSERT INTO default_cards(filename, artist) VALUES\n")
        sql_output.write(",\n".join(output_lines))
        sql_output.write("\nON CONFLICT DO NOTHING;")

    shutil.copyfile(SQL_OUTPUT, os.path.join(BACKEND_DIR, SQL_FILENAME))



def main():
    if len(sys.argv) > 1:
        directories = sys.argv[1:]
    else:
        src_dirs = os.path.join(SCRIPT_DIR, IMAGE_DIRECTORY)
        directories = [os.path.join(src_dirs, im_dir)
                                    for im_dir in os.listdir(src_dirs)]

    process_dirs(directories)

if __name__ == "__main__":
    main()