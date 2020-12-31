from inspect import getmembers, isfunction

import all_tests

def run_tests(tests, catch_exceptions=True):
    for name, function in tests:
        passed = True
        if catch_exceptions:
            try:
                passed = function()
            except Exception:
                passed = False
        else:
            passed = function()

        if passed:
            print("{}: passed".format(name))
        else:
            print("{}: failed".format(name))

def basic_tests():
    funcs = [
        all_tests.login,
        all_tests.login_multiple,
        all_tests.two_player_single_round,
        all_tests.two_player_double_round,
        all_tests.three_player_single_round
    ]
    return [(func.__name__, func) for func in funcs]

def leave_tests():
    funcs = [
        all_tests.leave_before_prompt,
        all_tests.leave_after_prompt,
        all_tests.leave_after_secret,
        all_tests.leave_before_guess,
        all_tests.leave_after_guess
    ]
    return [(func.__name__, func) for func in funcs]

def refresh_tests():
    funcs = [
        all_tests.refresh_before_prompt,
        all_tests.refresh_after_prompt,
        all_tests.refresh_after_secret,
        all_tests.refresh_before_guess,
        all_tests.refresh_after_guess
    ]
    return [(func.__name__, func) for func in funcs]

def rejoin_tests():
    funcs = [
        all_tests.rejoin_before_prompt,
        all_tests.rejoin_after_prompt,
        all_tests.rejoin_after_secret,
        all_tests.rejoin_before_guess,
        all_tests.rejoin_after_guess
    ]
    return [(func.__name__, func) for func in funcs]

def run_select_tests():
    test_functions = (basic_tests()   +
                      leave_tests()   +
                      refresh_tests() +
                      rejoin_tests())
    run_tests(test_functions)

def run_all_tests():
    test_functions = getmembers(all_tests, isfunction)
    run_tests(test_functions, catch_exceptions=True)

if __name__ == "__main__":
    run_select_tests()
