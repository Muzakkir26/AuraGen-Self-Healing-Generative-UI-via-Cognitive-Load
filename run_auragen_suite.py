# In run_auragen_suite.py - add this function:
def run_node_integration():
    print("\n" + "="*75)
    print(" STEP 17: REAL MODULE INTEGRATION TESTS (NODE.JS)")
    print("="*75)
    try:
        res = subprocess.run(
            ["node", "--test", os.path.join("Integration_Testing", "test_real_modules.test.js")],
            capture_output=True,
            text=True
        )
        if res.stdout:
            print(res.stdout.strip())
        if res.returncode != 0:
            print("\n[FAIL] Node Integration Tests failed:")
            if res.stderr:
                print(res.stderr.strip())
            return False
        return True
    except FileNotFoundError:
        print("[SKIP] Node.js runtime not found on system PATH.")
        return True
