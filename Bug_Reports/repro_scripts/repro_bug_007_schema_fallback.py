"""
Minimal Reproducible Example (MRE): BUG-007
Renderer Crash on Unrecognized Generative Token in AST
"""

class ComponentNotFoundException(Exception):
    pass

KNOWN_REGISTRY = {"Container", "Card", "Form", "InputField", "Button", "Text"}

def vulnerable_render_component(node: dict):
    node_type = node.get("type")
    if node_type not in KNOWN_REGISTRY:
        raise ComponentNotFoundException(f"Component '{node_type}' is not registered in component factory!")
    return f"<{node_type} id='{node.get('id')}' />"

def safe_render_with_fallback(node: dict):
    node_type = node.get("type")
    if node_type not in KNOWN_REGISTRY:
        print(f"[Fallback Interceptor] Unknown component '{node_type}' intercepted. Substituting safe Container fallback.")
        return f"<Container id='{node.get('id')}' data-fallback-for='{node_type}'>"
    return f"<{node_type} id='{node.get('id')}' />"

def main():
    alien_node = {
        "id": "hologram-card-42",
        "type": "HolographicCarousel3D",
        "props": {"speed": "instant"}
    }

    print("[BUG-007 Reproduction] Dispatching unregistered component 'HolographicCarousel3D'...")
    try:
        vulnerable_render_component(alien_node)
    except ComponentNotFoundException as e:
        print(f">>> BUG-007 REPRODUCED: ComponentNotFoundException triggered: {e}")

    print("[BUG-007 Reproduction] Dispatching through safe fallback engine...")
    rendered = safe_render_with_fallback(alien_node)
    print(f"[BUG-007 Healed Result] Successfully rendered fallback: {rendered}")
    print(">>> BUG-007 FIX VERIFIED: Rendered without unhandled exception.")

if __name__ == "__main__":
    main()
