def check_state(gameplay, users, storyteller_index,
                expected_scores):
    scores = gameplay.get_scores(users)

    if scores != expected_scores:
        return False

    card_states = gameplay.get_card_states(users)
    if card_states[storyteller_index] != 'correct-uid':
        return False

    for i, state in enumerate(card_states):
        if i != storyteller_index and state != 'inactive':
            return False

    return True

def check_local_card(gameplay, cid):
    card = gameplay.card_by_cid(cid)
    state = gameplay.card_state(card)

    return (state == 'local-card')

def play_all_correct_round(session, gameplay, user_tabs, users,
                           storyteller_index, expected_scores):

    storyteller_tab = user_tabs[storyteller_index]
    session.activate(storyteller_tab)
    correct_cid = gameplay.click_hand_card(0)
    gameplay.submit_hint()

    for tab in user_tabs:
        if tab == storyteller_tab:
            continue

        session.activate(tab)
        cid = gameplay.click_hand_card(0)
        gameplay.submit_secret()

    if not check_local_card(gameplay, cid):
        return False

    for tab in user_tabs:
        if tab == storyteller_tab:
            continue

        session.activate(tab)
        gameplay.click_cid(correct_cid)
        gameplay.submit_guess()

    if not check_state(gameplay, users, storyteller_index, expected_scores):
        return False

    expected_users = set(users)
    expected_users.remove(users[storyteller_index])

    choose_users = set(gameplay.players_choosing_card(users[storyteller_index]))

    return expected_users == choose_users
