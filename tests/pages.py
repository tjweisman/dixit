import time

from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

DIXIT_URL = "localhost:8000/users/weisman/dixit/"

class DixitPage:
    def __init__(self, driver, window_handle=None):
        self.driver = driver

        self.window_handle = window_handle
        if self.window_handle is None:
            self.window_handle = self.driver.current_window_handle

class StartPage(DixitPage):
    def delete_users(self):
        self.driver.find_element_by_id("delete_all_users").click()

    def get_join_button(self):
        return self.driver.find_element_by_css_selector("#join-controls #submit")

    def get_username_field(self):
        return self.driver.find_element_by_id("username")

    def get_room_field(self):
        return self.driver.find_element_by_css_selector("#join-controls #game")

    def join_game(self, username, room):
        self.get_username_field().clear()
        self.get_room_field().clear()

        self.get_username_field().send_keys(username)
        self.get_room_field().send_keys(room)

        self.get_join_button().click()

        return PregamePage(self.driver)

class ControlPage(DixitPage):
    def leave_game(self):
        self.driver.find_element_by_css_selector(".game-controls .leave-game").click()

    def reset_game(self):
        self.driver.find_element_by_css_selector(".game-controls .reset-game").click()

class PregamePage(ControlPage):
    def __init__(self, driver):
        super().__init__(driver)

    def users_list(self):
        player_elements = self.driver.find_elements_by_css_selector(
            "#game-info #players td.name"
        )
        return [element.text for element in player_elements]

    def room_name(self):
        pass

    def get_start_button(self):
        pass

    def start_game(self):
        self.driver.find_element_by_css_selector(
            "#options-form input[type='submit']").click()

class GameplayPage(ControlPage):
    def click_hand_card(self, index):
        hand_cards = self.driver.find_elements_by_css_selector("#hand li")
        hand_cards[index].click()
        return hand_cards[index].get_attribute("cid")

    def click_table_card(self, index):
        table_cards = self.driver.find_elements_by_css_selector("#table li")
        table_cards[index].click()
        return table_cards[index].get_attribute("cid")

    def click_allowable_table_card(self):
        allowable = self.driver.find_elements_by_css_selector(
            "#table li:not(.local-card)")

        if len(allowable) > 0:
            allowable[0].click()
            return allowable[0].get_attribute("cid")

    def click_cid(self, cid):
        selector = "#table li[cid='{}']".format(cid)
        self.driver.find_element_by_css_selector(selector).click()

    def set_hint_text(self, text):
        hint_elt = self.driver.find_element_by_id("prompt_inp")
        hint_elt.clear()

        hint_elt.send_keys(text)

    def submit_hint(self):
        self.driver.find_element_by_css_selector("#hint #submit").click()

    def submit_secret(self):
        self.driver.find_element_by_css_selector(".choose-secret button").click()

    def submit_guess(self):
        self.driver.find_element_by_css_selector("#guess-card button").click()

    def get_player_row(self, player):
        xpath = "//td[@class='name' and text() = '{}']//parent::tr".format(player)
        return self.driver.find_element_by_xpath(xpath)

    def player_uid(self, player):
        return self.get_player_row(player).get_attribute("uid")

    def player_table_card(self, player):
        xpath = ("//span[@class='card-owner' and text() = '{}']"
                 "//ancestor::li").format(player)
        return self.driver.find_element_by_xpath(xpath)

    def card_by_cid(self, cid):
        return self.driver.find_element_by_css_selector("li[cid='{}']".format(cid))

    def card_state(self, card):
        recognized = ["correct-uid", "active", "local-card"]
        classes = card.get_attribute("class").split()
        filtered = [classname for classname in classes if classname in recognized]

        if len(filtered) > 0:
            return filtered[0]

        return "inactive"

    def player_card_state(self, player):
        return self.card_state(self.player_table_card(player))

    def players_choosing_card(self, player):
        player_card = self.player_table_card(player)
        player_elts = player_card.find_elements_by_css_selector("div.guess-info li")
        return [elt.text for elt in player_elts]

    def player_score(self, player):
        player_row = self.get_player_row(player)
        return player_row.find_element_by_css_selector(".score").text

    def get_scores(self, players):
        return [self.player_score(player) for player in players]

    def get_card_states(self, players):
        return [self.player_card_state(player) for player in players]

    def get_player_choices(self, players):
        return [self.players_choosing_card(player) for player in players]




class DixitSession:
    def __init__(self, driver, num_tabs=1):
        self.driver = driver

        if num_tabs < 1:
            return

        self.window_handles = [None] * num_tabs
        self.window_handles[0] = self.driver.current_window_handle

        for i in range(1, num_tabs):
            driver.execute_script("window.open('');")

    def activate(self, index):
        self.driver.switch_to.window(self.driver.window_handles[index])

    def navigate(self):
        for handle in self.driver.window_handles:
            self.driver.switch_to.window(handle)
            self.driver.get(DIXIT_URL)

    def start_game(self):
        PregamePage(self.driver).start_game()
        return GameplayPage(self.driver)

    def login_page(self):
        return StartPage(self.driver)

    def pregame_page(self):
        return PregamePage(self.driver)

    def refresh(self):
        self.driver.refresh()

def create_game_session(driver, usernames, room):
    session = DixitSession(driver, len(usernames))
    session.navigate()

    start_page = StartPage(driver)
    start_page.delete_users()

    for i, user in enumerate(usernames):
        session.activate(i)
        start_page.join_game(user, room)

    return session
