with open("processed", "r") as processed_in:
    with open("processed_dates", "w") as processed_out:
        for line in processed_in:
            processed_out.write(line[:-1] + ", 2020-12-15\n")
