from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By

import pages
import subtests

def login():
    with webdriver.Firefox() as driver:
        driver.get("localhost:8000/users/weisman/dixit/")

        start_page = pages.StartPage(driver)
        start_page.delete_users()
        pregame = start_page.join_game("test_user", "test_room")

        return "test_user" in pregame.users_list()

def login_multiple():
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

        game_correct = subtests.play_all_correct_round(session, gameplay,
                                               [0, 1], users, 0, ["0", "2"])

        return game_correct

def two_player_double_round():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2"]
        session = pages.create_game_session(driver, users, "test_room")

        gameplay = session.start_game()

        round1_correct = subtests.play_all_correct_round(session, gameplay,
                                                         [0,1], users, 0, ["0", "2"])

        round2_correct = subtests.play_all_correct_round(session, gameplay,
                                                         [0,1], users, 1, ["2", "2"])

        return round1_correct and round2_correct

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

        return scores_correct and cards_correct and choices_correct

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

        return scores_correct and cards_correct and choices_correct

def leave_after_secret():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3"]
        session = pages.create_game_session(driver, users, "test_room")

        gameplay = session.start_game()

        session.activate(0)
        correct_cid = gameplay.click_hand_card(0)
        gameplay.submit_hint()

        session.activate(2)
        gameplay.click_hand_card(0)
        gameplay.submit_secret()
        gameplay.leave_game()

        session.activate(1)
        gameplay.click_hand_card(0)
        gameplay.submit_secret()

        gameplay.click_cid(correct_cid)
        gameplay.submit_guess()

        remaining_users = ['test_1', 'test_2']
        scores_correct = (gameplay.get_scores(remaining_users) == ['0', '2'])
        cards_correct = (gameplay.get_card_states(users) ==
                         ['correct-uid', 'inactive', 'inactive'])
        choices_correct = (gameplay.get_player_choices(users) ==
                           [['test_2'], [], []])

        return scores_correct and cards_correct and choices_correct

def leave_before_guess():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3"]
        session = pages.create_game_session(driver, users, "test_room")

        gameplay = session.start_game()

        session.activate(0)
        correct_cid = gameplay.click_hand_card(0)
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
        gameplay.click_cid(correct_cid)
        gameplay.submit_guess()

        remaining_users = ['test_1', 'test_2']
        scores_correct = (gameplay.get_scores(remaining_users) == ['0', '2'])
        cards_correct = (gameplay.get_card_states(users) ==
                         ['correct-uid', 'inactive', 'inactive'])
        choices_correct = (gameplay.get_player_choices(users) ==
                           [['test_2'], [], []])

        return scores_correct and cards_correct and choices_correct

def leave_after_guess():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3"]
        session = pages.create_game_session(driver, users, "test_room")

        gameplay = session.start_game()

        session.activate(0)
        correct_cid = gameplay.click_hand_card(0)
        gameplay.submit_hint()

        session.activate(2)
        p3_card = gameplay.click_hand_card(0)
        gameplay.submit_secret()

        session.activate(1)
        gameplay.click_hand_card(0)
        gameplay.submit_secret()

        session.activate(2)
        gameplay.click_cid(correct_cid)
        gameplay.submit_guess()
        gameplay.leave_game()

        session.activate(1)
        gameplay.click_cid(p3_card)
        gameplay.submit_guess()

        remaining_users = ['test_1', 'test_2']
        scores_correct = (gameplay.get_scores(remaining_users) == ['3', '0'])
        cards_correct = (gameplay.get_card_states(users) ==
                         ['correct-uid', 'inactive', 'inactive'])
        choices_correct = (gameplay.get_player_choices(users) ==
                           [['test_3'], [], ['test_2']])

        return scores_correct and cards_correct and choices_correct

def refresh_before_prompt():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3"]
        session = pages.create_game_session(driver, users, "test_room")

        gameplay = session.start_game()
        startpage = session.login_page()

        session.activate(2)
        session.refresh()
        startpage.join_game("test_3", "test_room")

        return subtests.play_all_correct_round(session, gameplay, [0,1,2], users,
                                               0, ["0", "2", "2"])

def refresh_after_prompt():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3"]
        session = pages.create_game_session(driver, users, "test_room")

        gameplay = session.start_game()
        startpage = session.login_page()

        session.activate(0)
        correct_cid = gameplay.click_hand_card(0)
        gameplay.set_hint_text("test hint")
        gameplay.submit_hint()

        session.activate(2)
        session.refresh()
        startpage.join_game("test_3", "test_room")

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

def refresh_after_secret():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3"]
        session = pages.create_game_session(driver, users, "test_room")

        gameplay = session.start_game()
        startpage = session.login_page()

        session.activate(0)
        correct_cid = gameplay.click_hand_card(0)
        gameplay.set_hint_text("test hint")
        gameplay.submit_hint()

        session.activate(2)
        p2_card = gameplay.click_hand_card(0)
        gameplay.submit_secret()

        session.refresh()
        startpage.join_game("test_3", "test_room")

        session.activate(1)
        p1_card = gameplay.click_hand_card(0)
        gameplay.submit_secret()

        session.activate(2)
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

def refresh_before_guess():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3"]
        session = pages.create_game_session(driver, users, "test_room")

        gameplay = session.start_game()
        startpage = session.login_page()

        session.activate(0)
        correct_cid = gameplay.click_hand_card(0)
        gameplay.set_hint_text("test hint")
        gameplay.submit_hint()

        session.activate(2)
        p2_card = gameplay.click_hand_card(0)
        gameplay.submit_secret()

        session.activate(1)
        p1_card = gameplay.click_hand_card(0)
        gameplay.submit_secret()

        session.activate(2)
        session.refresh()
        startpage.join_game("test_3", "test_room")

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

def refresh_after_guess():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3"]
        session = pages.create_game_session(driver, users, "test_room")

        gameplay = session.start_game()
        startpage = session.login_page()

        session.activate(0)
        correct_cid = gameplay.click_hand_card(0)
        gameplay.set_hint_text("test hint")
        gameplay.submit_hint()

        session.activate(2)
        p2_card = gameplay.click_hand_card(0)
        gameplay.submit_secret()

        session.activate(1)
        p1_card = gameplay.click_hand_card(0)
        gameplay.submit_secret()

        session.activate(1)
        gameplay.click_cid(p2_card)
        gameplay.submit_guess()

        session.activate(2)
        session.refresh()
        startpage.join_game("test_3", "test_room")
        gameplay.click_cid(correct_cid)
        gameplay.submit_guess()

        scores_correct = (gameplay.get_scores(users) == ['3', '0', '4'])
        cards_correct = (gameplay.get_card_states(users) == ['correct-uid',
                                                             'inactive',
                                                             'inactive'])
        choices_correct = (gameplay.get_player_choices(users) ==
                           [['test_3'], [], ['test_2']])

        return scores_correct and cards_correct and choices_correct

def rejoin_before_prompt():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3"]
        session = pages.create_game_session(driver, users, "test_room")
        pregame = session.pregame_page()

        session.activate(2)
        pregame.leave_game()

        session.activate(0)
        gameplay = session.start_game()
        startpage = session.login_page()

        session.activate(2)
        startpage.join_game("test_3", "test_room")

        return subtests.play_all_correct_round(session, gameplay, [0,1,2], users,
                                               0, ["0", "2", "2"])
def rejoin_after_prompt():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3"]
        session = pages.create_game_session(driver, users, "test_room")
        pregame = session.pregame_page()

        session.activate(2)
        pregame.leave_game()

        session.activate(0)
        gameplay = session.start_game()
        startpage = session.login_page()

        session.activate(0)
        correct_cid = gameplay.click_hand_card(0)
        gameplay.set_hint_text("test hint")
        gameplay.submit_hint()

        session.activate(2)
        startpage.join_game("test_3", "test_room")

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

def rejoin_after_secret():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3", "test_4"]
        session = pages.create_game_session(driver, users, "test_room")
        pregame = session.pregame_page()

        session.activate(3)
        pregame.leave_game()

        session.activate(0)
        gameplay = session.start_game()
        startpage = session.login_page()

        session.activate(0)
        correct_cid = gameplay.click_hand_card(0)
        gameplay.set_hint_text("test hint")
        gameplay.submit_hint()

        session.activate(1)
        p1_card = gameplay.click_hand_card(0)
        gameplay.submit_secret()

        session.activate(3)
        startpage.join_game("test_4", "test_room")
        p3_card = gameplay.click_hand_card(0)
        gameplay.submit_secret()

        session.activate(2)
        p2_card = gameplay.click_hand_card(0)
        gameplay.submit_secret()

        gameplay.click_cid(correct_cid)
        gameplay.submit_guess()

        session.activate(1)
        gameplay.click_cid(p3_card)
        gameplay.submit_guess()

        session.activate(3)
        gameplay.click_cid(correct_cid)
        gameplay.submit_guess()

        scores_correct = (gameplay.get_scores(users) == ['3', '0', '3', '4'])
        cards_correct = (gameplay.get_card_states(users) == ['correct-uid',
                                                             'inactive',
                                                             'inactive',
                                                             'inactive'])
        choices_correct = (gameplay.get_player_choices(users) ==
                           [['test_3', 'test_4'], [], [], ['test_2']])

        return scores_correct and cards_correct and choices_correct

def rejoin_before_guess():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3"]
        session = pages.create_game_session(driver, users, "test_room")
        pregame = session.pregame_page()

        session.activate(2)
        pregame.leave_game()

        session.activate(0)
        gameplay = session.start_game()
        startpage = session.login_page()

        session.activate(0)
        correct_cid = gameplay.click_hand_card(0)
        gameplay.set_hint_text("test hint")
        gameplay.submit_hint()

        session.activate(1)
        p1_card = gameplay.click_hand_card(0)
        gameplay.submit_secret()

        session.activate(2)
        startpage.join_game("test_3", "test_room")

        gameplay.click_cid(p1_card)
        gameplay.submit_guess()

        session.activate(1)
        gameplay.click_cid(correct_cid)
        gameplay.submit_guess()

        scores_correct = (gameplay.get_scores(users) == ['3', '4', '0'])
        secret_users = ["test_1", "test_2"]
        cards_correct = (gameplay.get_card_states(secret_users) == ['correct-uid',
                                                                    'inactive'])
        choices_correct = (gameplay.get_player_choices(secret_users) ==
                           [['test_2'], ['test_3']])

        return scores_correct and cards_correct and choices_correct

def rejoin_after_guess():
    with webdriver.Firefox() as driver:
        users = ["test_1", "test_2", "test_3", "test_4"]
        session = pages.create_game_session(driver, users, "test_room")
        pregame = session.pregame_page()

        session.activate(3)
        pregame.leave_game()

        session.activate(0)
        gameplay = session.start_game()
        startpage = session.login_page()

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

        gameplay.click_cid(p1_card)
        gameplay.submit_guess()

        session.activate(3)
        startpage.join_game("test_4", "test_room")

        gameplay.click_cid(correct_cid)
        gameplay.submit_guess()

        session.activate(1)
        gameplay.click_cid(p2_card)
        gameplay.submit_guess()

        scores_correct = (gameplay.get_scores(users) == ['3', '1', '1', '3'])

        secret_users = ["test_1", "test_2", "test_3"]
        cards_correct = (gameplay.get_card_states(secret_users) == ['correct-uid',
                                                             'inactive',
                                                             'inactive'])
        choices_correct = (gameplay.get_player_choices(secret_users) ==
                           [['test_4'], ['test_3'], ['test_2']])

        return scores_correct and cards_correct and choices_correct
