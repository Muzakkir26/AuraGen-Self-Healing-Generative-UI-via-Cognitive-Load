"""
Minimal Reproducible Example (MRE): BUG-001
Race Condition in Asynchronous LLM Streaming Overwrites In-Flight User Input
"""

import time
import sys

def simulate_naive_ast_replacement(current_dom_state: dict, incoming_ast_patch: dict) -> dict:
    """
    Vulnerable implementation: blindly overwrites DOM state with incoming AST snapshot,
    ignoring in-flight user keystrokes.
    """
    new_dom_state = {}
    for node in incoming_ast_patch.get("fields", []):
        new_dom_state[node["id"]] = node.get("defaultValue", "")
    return new_dom_state

def simulate_healed_ast_replacement(current_dom_state: dict, incoming_ast_patch: dict, dirty_keys: set) -> dict:
    """
    Fixed implementation: preserves dirty keystrokes across AST mutation.
    """
    new_dom_state = {}
    for node in incoming_ast_patch.get("fields", []):
        node_id = node["id"]
        if node_id in dirty_keys:
            # Preserve user input!
            new_dom_state[node_id] = current_dom_state[node_id]
        else:
            new_dom_state[node_id] = node.get("defaultValue", "")
    return new_dom_state

def main():
    print("[BUG-001 Reproduction] Initializing state race condition simulation...")
    # Step 1: Initial state
    dom_state = {"input-user-feedback": ""}
    dirty_keys = set()

    # Step 2: Trigger async LLM stream
    print("[BUG-001 Reproduction] Async LLM stream initiated (duration: ~400ms)...")
    incoming_ast_patch = {
        "id": "form-wizard-patch",
        "fields": [{"id": "input-user-feedback", "defaultValue": ""}]
    }

    # Step 3: User enters 42 chars while stream is in flight
    user_input = "Antigravity QA automated verification string"
    print(f"[BUG-001 Reproduction] User types in-flight: '{user_input}'")
    dom_state["input-user-feedback"] = user_input
    dirty_keys.add("input-user-feedback")

    # Step 4: Vulnerable patch arrives
    corrupted_state = simulate_naive_ast_replacement(dom_state, incoming_ast_patch)
    print(f"[BUG-001 Vulnerable Result] Field value after naive patch: '{corrupted_state['input-user-feedback']}'")
    if corrupted_state["input-user-feedback"] == "":
        print(">>> BUG-001 REPRODUCED: Uncommitted user input was completely wiped! (Invariant I_1 VIOLATED)")

    # Step 5: Healed patch arrives
    repaired_state = simulate_healed_ast_replacement(dom_state, incoming_ast_patch, dirty_keys)
    print(f"[BUG-001 Healed Result] Field value after 3-way reconciliation: '{repaired_state['input-user-feedback']}'")
    assert repaired_state["input-user-feedback"] == user_input, "Healed implementation failed to preserve input!"
    print(">>> BUG-001 FIX VERIFIED: User input successfully preserved. (Invariant I_1 SATISFIED)")

if __name__ == "__main__":
    main()
