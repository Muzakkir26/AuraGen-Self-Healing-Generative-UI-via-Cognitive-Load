"""
Minimal Reproducible Example (MRE): BUG-005
Viewport Breakpoint Resize Drops Wizard Step 2 Drafts
"""

def simulate_vulnerable_responsive_reflow(desktop_fields: list, mobile_wizard_steps: list) -> dict:
    """
    Vulnerable implementation: Only copies values from inputs rendered in Step 1 of the new wizard,
    dropping draft values belonging to subsequent wizard steps.
    """
    mobile_dom_state = {}
    step1_fields = set(mobile_wizard_steps[0]["field_ids"])
    for f in desktop_fields:
        if f["id"] in step1_fields:
            mobile_dom_state[f["id"]] = f["value"]
    return mobile_dom_state

def simulate_healed_responsive_reflow(desktop_fields: list, mobile_wizard_steps: list) -> dict:
    """
    Fixed implementation: Retains all field values in an decoupled global form dictionary,
    regardless of which step/breakpoint currently displays the node.
    """
    central_store = {}
    for f in desktop_fields:
        central_store[f["id"]] = f["value"]
    return central_store

def main():
    print("[BUG-005 Reproduction] Initializing form with 6 fields populated on Desktop (1440px)...")
    desktop_fields = [
        {"id": "field_name", "value": "Alice Smith"},
        {"id": "field_email", "value": "alice@antigravity.corp"},
        {"id": "field_address", "value": "42 Innovation Blvd"},
        {"id": "field_city", "value": "Metropolis"},
        {"id": "field_card_num", "value": "4111-2222-3333-4444"},
        {"id": "field_card_exp", "value": "12/28"}
    ]

    wizard_steps = [
        {"step": 1, "title": "Personal", "field_ids": ["field_name", "field_email"]},
        {"step": 2, "title": "Address", "field_ids": ["field_address", "field_city"]},
        {"step": 3, "title": "Payment", "field_ids": ["field_card_num", "field_card_exp"]}
    ]

    print("[BUG-005 Reproduction] Viewport resized: Desktop -> Mobile (375px). Form partitioned into 3 wizard steps.")

    # Vulnerable reflow
    vulnerable_state = simulate_vulnerable_responsive_reflow(desktop_fields, wizard_steps)
    print(f"\n[BUG-005 Vulnerable State] Retained fields: {list(vulnerable_state.keys())}")
    missing_fields = [f["id"] for f in desktop_fields if f["id"] not in vulnerable_state]
    print(f"Missing (dropped) field values: {missing_fields}")
    if len(missing_fields) == 4:
        print(">>> BUG-005 REPRODUCED: 4 user input fields permanently lost on resize! (Invariant I_1 VIOLATED)")

    # Healed reflow
    healed_state = simulate_healed_responsive_reflow(desktop_fields, wizard_steps)
    print(f"\n[BUG-005 Healed State] Retained fields: {list(healed_state.keys())}")
    for f in desktop_fields:
        assert healed_state[f["id"]] == f["value"], f"Field {f['id']} was not preserved!"

    print(">>> BUG-005 FIX VERIFIED: All 6 field drafts preserved across layout reflow. (Invariant I_1 SATISFIED)")

if __name__ == "__main__":
    main()
