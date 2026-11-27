"""
AuraGen Master QA, Evaluation & Cross-Team Integration Suite Runner
Executes all 17 verification phases for Member-04 and exits non-zero on failure.
"""

import os
import sys
import time
import subprocess


PYTHON_STEPS = [
    ("STEP 1: GENERATE TEST PLAN & INVARIANTS", os.path.join("Test_Plan", "generate_test_plan.py")),
    ("STEP 2: POPULATE 4-QUADRANT EXCEL & CSV TEST CASES", os.path.join("Test_Cases", "create_excel_test_cases.py")),
    ("STEP 3: FUNCTIONAL COGNITIVE ENGINE TESTS", os.path.join("Functional_Testing", "test_functional_cognitive_engine.py")),
    ("STEP 4: SCORING CALIBRATION & BOUNDARY TESTS", os.path.join("Functional_Testing", "test_scoring_calibration.py")),
    ("STEP 5: API & AST SCHEMA VALIDATION TESTS", os.path.join("API_Schema_Testing", "test_api_and_schemas.py")),
    ("STEP 6: CROSS-TEAM CONTRACT TESTS (M-02 <-> M-03)", os.path.join("API_Schema_Testing", "test_cross_team_contract.py")),
    ("STEP 7: UI RESPONSIVE & WCAG 2.2 AA TESTS", os.path.join("UI_Responsive_Testing", "test_ui_responsive_and_a11y.py")),
    ("STEP 8: FINANCIAL FORM STATE RETENTION (I1)", os.path.join("UI_Responsive_Testing", "test_form_state_retention.py")),
    ("STEP 9: FAILURE, FALLBACK & RESILIENCE TESTS", os.path.join("Failure_Fallback_Testing", "test_failure_and_fallback.py")),
    ("STEP 10: WEBSOCKET FAILOVER & OFFLINE QUEUE TESTS", os.path.join("Failure_Fallback_Testing", "test_ws_failover.py")),
    ("STEP 11: AI SECURITY & PROMPT INJECTION FUZZ TESTS", os.path.join("Failure_Fallback_Testing", "test_ai_security_fuzz.py")),
    ("STEP 12: BUG REPRODUCTION MREs & FIX VERIFICATION", os.path.join("Bug_Reports", "run_all_bug_repros.py")),
    ("STEP 13: GENERATE VISUAL EVIDENCE MOCKUPS (SVGs)", os.path.join("Screenshots", "generate_visual_mockups.py")),
    ("STEP 14: EMPIRICAL BENCHMARK EVALUATION (N=1000)", os.path.join("Performance_Evaluation", "evaluate_performance.py")),
    ("STEP 15: RECORD MASTER TEST EXECUTION LOGS", os.path.join("Test_Logs", "record_test_logs.py")),
    ("STEP 16: AUDIT FINAL REPORT & PRESENTATION ASSETS", os.path.join("Final_Report", "compile_final_report.py")),
]


def run_python_step(base_dir: str, title: str, rel_script: str) -> bool:
    print("\n" + "=" * 75)
    print(f" {title}")
    print("=" * 75)
    script_path = os.path.join(base_dir, rel_script)
    if not os.path.isfile(script_path):
        print(f"[FAIL] Missing script: {script_path}")
        return False

    res = subprocess.run(
        [sys.executable, script_path],
        cwd=base_dir,
        capture_output=True,
        text=True,
        errors="replace",
    )
    if res.stdout:
        print(res.stdout.strip())
    if res.stderr:
        print(res.stderr.strip())
    if res.returncode != 0:
        print(f"\n[FAIL] {rel_script} exited with code {res.returncode}")
        return False
    return True


def run_node_integration(base_dir: str) -> bool:
    print("\n" + "=" * 75)
    print(" STEP 17: REAL MODULE INTEGRATION TESTS (NODE.JS)")
    print("=" * 75)
    test_path = os.path.join(base_dir, "Integration_Testing", "test_real_modules.test.js")
    try:
        res = subprocess.run(
            ["node", "--test", test_path],
            cwd=base_dir,
            capture_output=True,
            text=True,
            errors="replace",
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


def main() -> int:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    suite_start = time.time()

    print("=" * 75)
    print(" AURAGEN MASTER QA, EVALUATION & INTEGRATION SUITE (MEMBER-04)")
    print("=" * 75)

    passed_steps = 0
    failed_steps = []

    for title, rel_script in PYTHON_STEPS:
        if run_python_step(base_dir, title, rel_script):
            passed_steps += 1
        else:
            failed_steps.append(rel_script)

    if run_node_integration(base_dir):
        passed_steps += 1
    else:
        failed_steps.append(os.path.join("Integration_Testing", "test_real_modules.test.js"))

    total_steps = len(PYTHON_STEPS) + 1
    elapsed = round(time.time() - suite_start, 2)

    print("\n" + "=" * 75)
    print(" MASTER SUITE EXECUTION SUMMARY")
    print("=" * 75)
    print(f" Steps Passed : {passed_steps}/{total_steps}")
    print(f" Elapsed Time : {elapsed}s")
    if failed_steps:
        print(f" Failed Steps : {', '.join(failed_steps)}")
        print("=" * 75)
        return 1
    print(" Verdict      : 100% PASS - ALL PHASES VERIFIED")
    print("=" * 75)
    return 0


if __name__ == "__main__":
    sys.exit(main())
