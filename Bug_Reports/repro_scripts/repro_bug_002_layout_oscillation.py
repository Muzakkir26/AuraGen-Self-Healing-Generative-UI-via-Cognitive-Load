"""
Minimal Reproducible Example (MRE): BUG-002
Hysteresis Failure and Layout Oscillation Thrashing Under Boundary Jitter
"""

import time
import sys

def simulate_naive_trigger(ecl_series: list, threshold: float = 0.70) -> list:
    """
    Vulnerable implementation without hysteresis:
    Flips state on every single boundary crossing.
    """
    state = "MONOLITH"
    transitions = []
    for idx, ecl in enumerate(ecl_series):
        if ecl >= threshold and state == "MONOLITH":
            state = "WIZARD"
            transitions.append((idx, ecl, "HEAL_TO_WIZARD"))
        elif ecl < threshold and state == "WIZARD":
            state = "MONOLITH"
            transitions.append((idx, ecl, "REVERT_TO_MONOLITH"))
    return transitions

def simulate_hysteresis_trigger(ecl_series: list, tau_high: float = 0.70, tau_low: float = 0.55, cooldown_steps: int = 5) -> list:
    """
    Fixed implementation with Schmitt Trigger hysteresis and cooldown counter.
    """
    state = "MONOLITH"
    transitions = []
    last_transition_step = -999

    for idx, ecl in enumerate(ecl_series):
        steps_since_last = idx - last_transition_step
        if state == "MONOLITH":
            if ecl >= tau_high and steps_since_last >= cooldown_steps:
                state = "WIZARD"
                last_transition_step = idx
                transitions.append((idx, ecl, "HEAL_TO_WIZARD"))
        elif state == "WIZARD":
            if ecl <= tau_low and steps_since_last >= cooldown_steps:
                state = "MONOLITH"
                last_transition_step = idx
                transitions.append((idx, ecl, "REVERT_TO_MONOLITH"))
    return transitions

def main():
    print("[BUG-002 Reproduction] Generating sinusoidal boundary ECL telemetry stream...")
    # Fluctuates across 0.70 threshold: 0.69 <-> 0.71
    ecl_series = [0.65, 0.69, 0.71, 0.69, 0.71, 0.69, 0.72, 0.69, 0.71, 0.68, 0.54, 0.50]
    print(f"ECL telemetry stream: {ecl_series}")

    # Vulnerable run
    naive_transitions = simulate_naive_trigger(ecl_series, threshold=0.70)
    print(f"\n[BUG-002 Vulnerable Run] Total Layout Transitions: {len(naive_transitions)}")
    for step, val, action in naive_transitions:
        print(f"  Step {step:02d} | ECL={val:.2f} -> {action}")

    if len(naive_transitions) >= 6:
        print(">>> BUG-002 REPRODUCED: Severe layout oscillation thrashing! (Invariant I_3 VIOLATED)")

    # Healed run
    damped_transitions = simulate_hysteresis_trigger(ecl_series, tau_high=0.70, tau_low=0.55, cooldown_steps=4)
    print(f"\n[BUG-002 Healed Run] Total Layout Transitions: {len(damped_transitions)}")
    for step, val, action in damped_transitions:
        print(f"  Step {step:02d} | ECL={val:.2f} -> {action}")

    assert len(damped_transitions) == 2, f"Expected exactly 2 stable transitions, got {len(damped_transitions)}"
    print(">>> BUG-002 FIX VERIFIED: Hysteresis damping prevented rapid UI thrashing. (Invariant I_3 SATISFIED)")

if __name__ == "__main__":
    main()
