#! /usr/bin/env python

import sys
import re
import os
import subprocess

SCRIPT_DIR = "/home/teddy/projects/dixit/cards"
BACKEND_DIR = "/home/teddy/projects/dixit/backend"
FRONTEND_DIR = "/home/teddy/projects/dixit/frontend"

FRONTEND_CARD_PATH = "cards"
SQL_OUTPUT_FILE = "insert_cards.sql"

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
        with open(process_path, 'r') as processed:
            return {filename.strip() for filename in processed}
    except FileNotFoundError:
        log("No list of processed files found, skipping.")


def run_standardize(directory, processed_files=None,
                    processed_handle=None, process_images=True):

    output_directory = os.path.join(FRONTEND_DIR, FRONTEND_CARD_PATH)
    files = os.listdir(directory)
    output_lines = []

    if not processed_handle:
        log("No handle provided for processed files! The script will not"
            "remember which files were updated on this run.")

    for index, filename in enumerate(files):
        output_filename = "{}_{}.png".format(os.path.basename(directory),
                                             index)

        input_path = os.path.join(directory, filename)
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
                processed_handle.write(input_path + "\n")

        else:
            log("Skipping file: {}".format(input_path))

        output_lines.append("('{}')".format(output_filename))

    return output_lines


def process_dirs(directories):
    processed_files = load_processed()
    output_lines = []

    with open(get_processed_path(), 'a') as processed_handle:
        for dirname in directories:
            addl_files = run_standardize(
                dirname,
                processed_files, processed_handle)

            output_lines += addl_files

    with open(os.path.join(BACKEND_DIR, SQL_OUTPUT_FILE), 'w') as sql_output:
        sql_output.write("INSERT INTO default_cards(filenames) VALUES\n")
        sql_output.write(",\n".join(output_lines))
        sql_output.write("\nON CONFLICT DO NOTHING;")

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
