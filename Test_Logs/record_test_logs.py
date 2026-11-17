
"""
AuraGen Test Execution Logger
Records accurate PASS, FAIL and ERROR results.
Generates JSON and TXT execution reports.
"""

import os
import sys
import json
import re
import time
import subprocess
import datetime
import traceback


def get_test_count(output):
    """Extract actual test count from unittest or pytest output."""

    # Python unittest: Ran 5 tests in 0.001s
    match = re.search(r"Ran\s+(\d+)\s+tests?", output)

    if match:
        return int(match.group(1))

    # pytest: 5 passed, 2 failed
    match = re.search(
        r"(\d+)\s+(?:passed|failed|error|skipped|xfailed|xpassed)",
        output
    )

    if match:
        return int(match.group(1))

    return None


def classify_status(return_code, output, launch_error=None):
    """Determine actual suite status."""

    if launch_error:
        return "ERROR"

    if "Traceback (most recent call last):" in output:
        return "ERROR"

    if re.search(r"ModuleNotFoundError|ImportError|FileNotFoundError", output):
        return "ERROR"

    if re.search(r"FAILED\s*\([^)]*errors\s*=", output):
        return "ERROR"

    if re.search(r"(^|\n)ERROR:", output):
        return "ERROR"

    if return_code != 0:
        return "FAIL"

    return "PASS"


def main():

    base_dir = os.path.dirname(
        os.path.dirname(os.path.abspath(__file__))
    )

    logs_dir = os.path.join(base_dir, "Test_Logs")
    os.makedirs(logs_dir, exist_ok=True)

    test_scripts = [
        os.path.join(
            base_dir,
            "Functional_Testing",
            "test_functional_cognitive_engine.py"
        ),
        os.path.join(
            base_dir,
            "API_Schema_Testing",
            "test_api_and_schemas.py"
        ),
        os.path.join(
            base_dir,
            "UI_Responsive_Testing",
            "test_ui_responsive_and_a11y.py"
        ),
        os.path.join(
            base_dir,
            "Failure_Fallback_Testing",
            "test_failure_and_fallback.py"
        )
    ]

    start_time = time.time()
    run_timestamp = datetime.datetime.now().astimezone().isoformat()

    results = []

    print("=" * 70)
    print(" AURAGEN TEST EXECUTION LOGGER")
    print(" Timestamp:", run_timestamp)
    print("=" * 70)

    for script in test_scripts:

        test_name = os.path.basename(script)
        suite_timestamp = datetime.datetime.now().astimezone().isoformat()
        suite_start = time.time()

        print(f"\nRunning: {test_name}")

        stdout = ""
        stderr = ""
        launch_error = None
        return_code = None

        if not os.path.isfile(script):
            launch_error = f"Test script not found: {script}"

        else:
            try:
                process = subprocess.run(
                    [sys.executable, script],
                    cwd=base_dir,
                    capture_output=True,
                    text=True,
                    errors="replace",
                    timeout=300
                )

                stdout = process.stdout or ""
                stderr = process.stderr or ""
                return_code = process.returncode

            except subprocess.TimeoutExpired:
                launch_error = "Test execution exceeded 300 seconds."

            except Exception:
                launch_error = traceback.format_exc()

        combined_output = stdout + "\n" + stderr

        if launch_error:
            combined_output += "\n" + launch_error

        status = classify_status(
            return_code,
            combined_output,
            launch_error
        )

        tests_run = get_test_count(combined_output)

        # Extract actual unittest or pytest failure/error counts.
        failure_count = 0
        error_count = 0

        failure_match = re.search(
            r"failures\s*=\s*(\d+)", combined_output
        )
        error_match = re.search(
            r"errors\s*=\s*(\d+)", combined_output
        )

        if failure_match:
            failure_count = int(failure_match.group(1))

        if error_match:
            error_count = int(error_match.group(1))

        if status == "FAIL" and failure_count == 0:
            failure_count = 1

        if status == "ERROR" and error_count == 0:
            error_count = 1

        suite_elapsed = round(time.time() - suite_start, 3)

        # Keep error details separately for easier debugging.
        error_details = []

        if launch_error:
            error_details.append(launch_error)

        if status == "ERROR" and stderr.strip():
            error_details.append(stderr.strip())

        if status == "FAIL":
            error_details.append(
                stderr.strip() or stdout.strip() or
                "Test suite returned a non-zero exit code."
            )

        result = {
            "test_name": test_name,
            "timestamp": suite_timestamp,
            "status": status,
            "return_code": return_code,
            "tests_run": tests_run,
            "failures": failure_count,
            "errors": error_count,
            "elapsed_seconds": suite_elapsed,
            "error_details": error_details,
            "stdout": stdout,
            "stderr": stderr
        }

        results.append(result)

        print(
            f"[{status}] {test_name} | "
            f"Tests: {tests_run if tests_run is not None else 'Unknown'}"
        )

        if error_details:
            print("Error details:", error_details[0][:500])

    # Calculate actual suite totals.
    total_suites = len(results)
    passed = sum(r["status"] == "PASS" for r in results)
    failed = sum(r["status"] == "FAIL" for r in results)
    errors = sum(r["status"] == "ERROR" for r in results)

    known_test_counts = [
        r["tests_run"] for r in results
        if r["tests_run"] is not None
    ]

    total_tests = (
        sum(known_test_counts)
        if len(known_test_counts) == total_suites
        else None
    )

    pass_rate = round(
        (passed / total_suites) * 100, 2
    ) if total_suites else 0

    if errors:
        overall_status = "ERROR"
    elif failed:
        overall_status = "FAIL"
    elif passed == total_suites and total_suites > 0:
        overall_status = "PASS"
    else:
        overall_status = "ERROR"

    elapsed = round(time.time() - start_time, 3)

    report = {
        "project": "AuraGen",
        "timestamp": run_timestamp,
        "overall_status": overall_status,
        "total_suites": total_suites,
        "passed": passed,
        "failed": failed,
        "errors": errors,
        "total_tests": total_tests,
        "suite_pass_rate_percent": pass_rate,
        "elapsed_seconds": elapsed,
        "suites": results
    }

    # Save JSON report.
    json_path = os.path.join(
        logs_dir, "test_execution_log.json"
    )

    with open(json_path, "w", encoding="utf-8") as file:
        json.dump(report, file, indent=4)

    # Save TXT report.
    txt_path = os.path.join(
        logs_dir, "test_execution_log.txt"
    )

    with open(txt_path, "w", encoding="utf-8") as file:

        file.write("AURAGEN TEST EXECUTION REPORT\n")
        file.write("=" * 60 + "\n")
        file.write(f"Timestamp: {run_timestamp}\n")
        file.write(f"Overall Status: {overall_status}\n")
        file.write(f"Total Suites: {total_suites}\n")
        file.write(f"Passed: {passed}\n")
        file.write(f"Failed: {failed}\n")
        file.write(f"Errors: {errors}\n")
        file.write(f"Known Total Tests: {total_tests}\n")
        file.write(f"Suite Pass Rate: {pass_rate}%\n")
        file.write(f"Execution Time: {elapsed} seconds\n")

        file.write("\nINDIVIDUAL TEST RESULTS\n")
        file.write("=" * 60 + "\n")

        for result in results:

            file.write(f"\nTest: {result['test_name']}\n")
            file.write(f"Timestamp: {result['timestamp']}\n")
            file.write(f"Status: {result['status']}\n")
            file.write(f"Tests Run: {result['tests_run']}\n")
            file.write(f"Failures: {result['failures']}\n")
            file.write(f"Errors: {result['errors']}\n")

            if result["error_details"]:
                file.write("Error Details:\n")
                for detail in result["error_details"]:
                    file.write(detail + "\n")

            file.write("-" * 60 + "\n")

    print("\n" + "=" * 70)
    print(" AURAGEN EXECUTION SUMMARY")
    print("=" * 70)
    print("Overall Status:", overall_status)
    print("Total Suites:", total_suites)
    print("Passed:", passed)
    print("Failed:", failed)
    print("Errors:", errors)
    print("Known Total Tests:", total_tests)
    print("Suite Pass Rate:", str(pass_rate) + "%")
    print("Execution Time:", elapsed, "seconds")
    print("\nJSON Report:", json_path)
    print("TXT Report:", txt_path)
    print("=" * 70)

    # Non-zero exit code if anything failed or errored.
    return 0 if overall_status == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
