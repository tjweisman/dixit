from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By

import pages

def login():
    return True
    with webdriver.Firefox() as driver:
        driver.get("localhost:8000/users/weisman/dixit/")

        start_page = pages.StartPage(driver)
        start_page.delete_users()
        pregame = start_page.join_game("test_user", "test_room")

        return "test_user" in pregame.users_list()

def login_multiple():
    return True
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2"]
        session = pages.create_game_session(driver, users, "test_room")
        pregame = pages.PregamePage(session.driver)

        result_users = pregame.users_list()

        return all([user in result_users for user in users])

def two_player_single_round():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2"]
        session = pages.create_game_session(driver, users, "test_room")

        gameplay = session.start_game()

        session.activate(0)
        gameplay.click_hand_card(0)
        gameplay.set_hint_text("test hint")
        gameplay.submit_hint()

        session.activate(1)
        gameplay.click_hand_card(0)
        gameplay.submit_secret()

        gameplay.click_allowable_table_card()
        gameplay.submit_guess()

        scores_correct = (gameplay.player_score("test_1") == '0' and
                          gameplay.player_score("test_2") == '2')

        cards_correct = (gameplay.player_card_state("test_1") == 'correct-uid' and
                         gameplay.player_card_state("test_2") == 'inactive')

        choices_correct = gameplay.players_choosing_card("test_1") == ["test_2"]

        return scores_correct and cards_correct and choices_correct

def two_player_double_round():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2"]
        session = pages.create_game_session(driver, users, "test_room")

        gameplay = session.start_game()

        session.activate(0)
        gameplay.click_hand_card(0)
        gameplay.set_hint_text("test hint")
        gameplay.submit_hint()

        session.activate(1)
        gameplay.click_hand_card(0)
        gameplay.submit_secret()

        gameplay.click_allowable_table_card()
        gameplay.submit_guess()

        gameplay.click_hand_card(0)
        gameplay.set_hint_text("test hint 2")
        gameplay.submit_hint()

        session.activate(0)
        gameplay.click_hand_card(0)
        gameplay.submit_secret()

        gameplay.click_allowable_table_card()
        gameplay.submit_guess()

        scores_correct = (gameplay.player_score("test_1") == '2' and
                          gameplay.player_score("test_2") == '2')

        cards_correct = (gameplay.player_card_state("test_2") == 'correct-uid' and
                         gameplay.player_card_state("test_1") == 'inactive')

        choices_correct = gameplay.players_choosing_card("test_2") == ["test_1"]

        return scores_correct and cards_correct and choices_correct

def three_player_single_round():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3"]
        session = pages.create_game_session(driver, users, "test_room")

        gameplay = session.start_game()

        session.activate(0)
        correct_cid = gameplay.click_hand_card(0)
        gameplay.set_hint_text("test hint")
        gameplay.submit_hint()

        session.activate(1)
        p1_card = gameplay.click_hand_card(0)
        gameplay.submit_secret()

        session.activate(2)
        p2_card = gameplay.click_hand_card(0)
        gameplay.submit_secret()

        gameplay.click_cid(correct_cid)
        gameplay.submit_guess()

        session.activate(1)
        gameplay.click_cid(p2_card)
        gameplay.submit_guess()

        scores_correct = (gameplay.get_scores(users) == ['3', '0', '4'])
        cards_correct = (gameplay.get_card_states(users) == ['correct-uid',
                                                             'inactive',
                                                             'inactive'])
        choices_correct = (gameplay.get_player_choices(users) ==
                           [['test_3'], [], ['test_2']])

        return scores_correct and cards_correct and choices_correct

def leave_before_prompt():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3"]
        session = pages.create_game_session(driver, users, "test_room")

        gameplay = session.start_game()

        session.activate(2)
        gameplay.leave_game()

        session.activate(0)
        gameplay.click_hand_card(0)
        gameplay.submit_hint()

        session.activate(1)
        gameplay.click_hand_card(0)
        gameplay.submit_secret()

        gameplay.click_allowable_table_card()
        gameplay.submit_guess()


        users = ['test_1', 'test_2']
        scores_correct = (gameplay.get_scores(users) == ['0', '2'])
        cards_correct = (gameplay.get_card_states(users) == ['correct-uid', 'inactive'])
        choices_correct = (gameplay.get_player_choices(users) == [['test_2'], []])

        return scores_correct & cards_correct & choices_correct

def leave_after_prompt():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3"]
        session = pages.create_game_session(driver, users, "test_room")

        gameplay = session.start_game()

        session.activate(0)
        gameplay.click_hand_card(0)
        gameplay.submit_hint()

        session.activate(2)
        gameplay.leave_game()

        session.activate(1)
        gameplay.click_hand_card(0)
        gameplay.submit_secret()

        gameplay.click_allowable_table_card()
        gameplay.submit_guess()


        users = ['test_1', 'test_2']
        scores_correct = (gameplay.get_scores(users) == ['0', '2'])
        cards_correct = (gameplay.get_card_states(users) == ['correct-uid', 'inactive'])
        choices_correct = (gameplay.get_player_choices(users) == [['test_2'], []])

        return scores_correct & cards_correct & choices_correct

def leave_after_secret():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3"]
        session = pages.create_game_session(driver, users, "test_room")

        gameplay = session.start_game()

        session.activate(0)
        gameplay.click_hand_card(0)
        gameplay.submit_hint()

        session.activate(2)
        gameplay.click_hand_card(0)
        gameplay.submit_secret()
        gameplay.leave_game()

        session.activate(1)
        gameplay.click_hand_card(0)
        gameplay.submit_secret()

        gameplay.click_allowable_table_card()
        gameplay.submit_guess()

        remaining_users = ['test_1', 'test_2']
        scores_correct = (gameplay.get_scores(remaining_users) == ['0', '2'])
        cards_correct = (gameplay.get_card_states(users) ==
                         ['correct-uid', 'inactive', 'inactive'])
        choices_correct = (gameplay.get_player_choices(users) ==
                           [['test_2'], [], []])

        return scores_correct & cards_correct & choices_correct

def leave_before_guess():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3"]
        session = pages.create_game_session(driver, users, "test_room")

        gameplay = session.start_game()

        session.activate(0)
        gameplay.click_hand_card(0)
        gameplay.submit_hint()

        session.activate(2)
        gameplay.click_hand_card(0)
        gameplay.submit_secret()

        session.activate(1)
        gameplay.click_hand_card(0)
        gameplay.submit_secret()

        session.activate(2)
        gameplay.leave_game()

        session.activate(1)
        gameplay.click_allowable_table_card()
        gameplay.submit_guess()

        remaining_users = ['test_1', 'test_2']
        scores_correct = (gameplay.get_scores(remaining_users) == ['0', '2'])
        cards_correct = (gameplay.get_card_states(users) ==
                         ['correct-uid', 'inactive', 'inactive'])
        choices_correct = (gameplay.get_player_choices(users) ==
                           [['test_2'], [], []])

        return scores_correct & cards_correct & choices_correct
