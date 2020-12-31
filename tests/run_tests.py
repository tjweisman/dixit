from inspect import getmembers, isfunction

import all_tests

def run_tests(tests):


    for name, function in tests:
        passed = True
        #try:
        passed = function()
        #except Exception:
        #passed = False

        if passed:
            print("{}: passed".format(name))
        else:
            print("{}: failed".format(name))

def run_select_tests():
    test_functions = [
#        ("leave_before_prompt", all_tests.leave_before_prompt),
#        ("leave_after_prompt", all_tests.leave_after_prompt),
#        ("leave_after_secret", all_tests.leave_after_secret),
        ("leave_before_guess", all_tests.leave_after_secret)
    ]
    run_tests(test_functions)

def run_all_tests():
    test_functions = getmembers(all_tests, isfunction)
    run_tests(test_functions)

if __name__ == "__main__":
    run_select_tests()
