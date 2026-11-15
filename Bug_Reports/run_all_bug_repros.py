"""
AuraGen Bug Reproduction Master Runner
Executes Minimal Reproducible Examples (MREs) for:
- BUG-001 (P0): In-Flight State Keystroke Race
- BUG-002 (P1): Hysteresis Damping & Layout Thrashing
- BUG-004 (P0): Circular Component AST Recursion Loop
- BUG-005 (P0): Viewport Breakpoint Draft Dropping
- BUG-007 (P1): Unrecognized Generative Token Fallback
"""

import os
import subprocess
import sys

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    repro_dir = os.path.join(base_dir, "repro_scripts")
    scripts = [
        "repro_bug_001_state_race.py",
        "repro_bug_002_layout_oscillation.py",
        "repro_bug_004_circular_ast.py",
        "repro_bug_005_responsive_draft_drop.py",
        "repro_bug_007_schema_fallback.py"
    ]

    print("=" * 75)
    print(" AURAGEN DEFECT REPRODUCTION & MRE VERIFICATION RUNNER")
    print("=" * 75)

    passed_fixes = 0
    for s in scripts:
        script_path = os.path.join(repro_dir, s)
        print(f"\n--- Running: {s} ---")
        proc = subprocess.run([sys.executable, script_path], capture_output=True, text=True)
        print(proc.stdout.strip())
        if "FIX VERIFIED" in proc.stdout:
            passed_fixes += 1

    print("\n" + "=" * 75)
    print(f" Summary: {passed_fixes}/{len(scripts)} Defect Fixes Verified Against Quality Invariants.")
    print("=" * 75)

if __name__ == "__main__":
    main()
