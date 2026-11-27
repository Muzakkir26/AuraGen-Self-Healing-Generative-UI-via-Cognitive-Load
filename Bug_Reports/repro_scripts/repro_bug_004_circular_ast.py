"""
Minimal Reproducible Example (MRE): BUG-004
Unbounded Recursion on Circular AST Component References
"""

import sys

def vulnerable_traverse(node: dict, depth: int = 0) -> int:
    """
    Vulnerable traversal without cycle detection: leads to RecursionError.
    """
    count = 1
    for child in node.get("children", []):
        count += vulnerable_traverse(child, depth + 1)
    return count

def safe_traverse(node: dict, visited: set = None, max_depth: int = 8) -> int:
    """
    Safe traversal with cycle detection and depth capping.
    """
    if visited is None:
        visited = set()

    node_id = node.get("id")
    if node_id in visited:
        print(f"[Safe Traversal] Cycle detected at node '{node_id}', pruning path.")
        return 1
    if len(visited) >= max_depth:
        print(f"[Safe Traversal] Max depth {max_depth} reached, truncating.")
        return 1

    visited_next = visited.copy()
    visited_next.add(node_id)

    count = 1
    for child in node.get("children", []):
        count += safe_traverse(child, visited_next, max_depth)
    return count

def main():
    print("[BUG-004 Reproduction] Constructing circular AST loop: Node-A -> Node-B -> Node-A...")
    node_a = {"id": "Node-A", "type": "Card", "children": []}
    node_b = {"id": "Node-B", "type": "Card", "children": []}
    node_a["children"] = [node_b]
    node_b["children"] = [node_a]

    # Vulnerable run
    print("[BUG-004 Reproduction] Running vulnerable recursive traversal...")
    try:
        # Lower recursion limit temporarily to trigger quickly
        sys.setrecursionlimit(200)
        vulnerable_traverse(node_a)
    except RecursionError as e:
        print(f">>> BUG-004 REPRODUCED: RecursionError triggered: {e}")
    finally:
        sys.setrecursionlimit(1000)

    # Safe run
    print("[BUG-004 Reproduction] Running safe cycle-detecting traversal...")
    total_nodes = safe_traverse(node_a, max_depth=8)
    print(f"[BUG-004 Healed Result] Safe traversal completed. Total nodes evaluated: {total_nodes}")
    print(">>> BUG-004 FIX VERIFIED: Cycle detected and pruned without crash.")

if __name__ == "__main__":
    main()
