"""
AuraGen Functional Testing Suite
Subsystem: Cognitive Load Engine & Progressive Disclosure Heuristics
Covers: TC-NORM-001, TC-NORM-002, TC-NORM-004, TC-EDGE-001
"""

import math
import unittest
from typing import List, Tuple, Dict, Any

class HickHymanEngine:
    @staticmethod
    def calculate_decision_friction(num_choices: int, observed_latency_sec: float, b_rate: float = 0.25) -> float:
        """
        Calculates Hick-Hyman theoretical decision capacity and maps to sigmoid friction.
        """
        if num_choices <= 0:
            return 0.0
        theoretical_capacity = b_rate * math.log2(num_choices + 1)
        ratio = observed_latency_sec / max(0.01, theoretical_capacity)
        # Sigmoid friction curve centered around 2.0x threshold
        friction = 1.0 / (1.0 + math.exp(-1.2 * (ratio - 2.0)))
        return round(friction, 4)

class MotorKinematicsEngine:
    @staticmethod
    def calculate_cursor_jitter(points: List[Tuple[float, float, float]]) -> float:
        """
        Calculates angular entropy / directional jitter across trajectory points (x, y, t).
        """
        if len(points) < 3:
            return 0.0
        angle_diffs = []
        for i in range(len(points) - 2):
            p1, p2, p3 = points[i], points[i+1], points[i+2]
            v1 = (p2[0] - p1[0], p2[1] - p1[1])
            v2 = (p3[0] - p2[0], p3[1] - p2[1])
            dot = v1[0]*v2[0] + v1[1]*v2[1]
            m1 = math.sqrt(v1[0]**2 + v1[1]**2)
            m2 = math.sqrt(v2[0]**2 + v2[1]**2)
            if m1 > 0 and m2 > 0:
                cos_angle = max(-1.0, min(1.0, dot / (m1 * m2)))
                angle = math.acos(cos_angle)
                angle_diffs.append(angle)
        if not angle_diffs:
            return 0.0
        mean_angle = sum(angle_diffs) / len(angle_diffs)
        jitter = min(1.0, mean_angle / (math.pi / 2))
        return round(jitter, 4)

class CognitiveLoadAggregator:
    @staticmethod
    def compute_ecl(f_latency: float, j_cursor: float, b_backtracking: float = 0.1) -> float:
        """
        Computes composite Extraneous Cognitive Load (ECL).
        Formula: 0.45 * F_latency + 0.35 * J_cursor + 0.20 * B_backtracking
        """
        ecl = (0.45 * f_latency) + (0.35 * j_cursor) + (0.20 * b_backtracking)
        return round(min(1.0, max(0.0, ecl)), 4)

class HeuristicTransformer:
    @staticmethod
    def progressive_disclosure(form_ast: Dict[str, Any], fields_per_step: int = 6) -> Dict[str, Any]:
        """
        Splits a monolithic form into a multi-step wizard AST.
        """
        fields = form_ast.get("children", [])
        if len(fields) <= fields_per_step:
            return form_ast
        steps = []
        for i in range(0, len(fields), fields_per_step):
            step_chunk = fields[i:i+fields_per_step]
            step_num = (i // fields_per_step) + 1
            steps.append({
                "type": "WizardStep",
                "id": f"step-{step_num}",
                "title": f"Section {step_num}",
                "children": step_chunk
            })
        return {
            "type": "WizardContainer",
            "id": f"{form_ast.get('id')}-healed-wizard",
            "activeStep": 1,
            "totalSteps": len(steps),
            "children": steps
        }

class TestCognitiveEngineFunctional(unittest.TestCase):
    def test_hick_hyman_friction(self):
        # 12 choices, 3.8s reaction latency
        friction = HickHymanEngine.calculate_decision_friction(12, 3.8)
        self.assertGreater(friction, 0.70, "Hesitation should be flagged above threshold")
        print(f"  [PASS] Hick-Hyman Decision Friction: {friction:.4f}")

    def test_cursor_jitter_calculation(self):
        # Erratic jitter path
        points = [(0, 0, 0), (10, 5, 50), (5, 12, 100), (15, 8, 150), (8, 20, 200)]
        jitter = MotorKinematicsEngine.calculate_cursor_jitter(points)
        self.assertGreater(jitter, 0.60, "Motor jitter entropy should reflect trajectory fluctuations")
        print(f"  [PASS] Cursor Jitter Entropy: {jitter:.4f}")

    def test_ecl_overload_trigger(self):
        ecl = CognitiveLoadAggregator.compute_ecl(f_latency=0.85, j_cursor=0.75, b_backtracking=0.40)
        self.assertGreaterEqual(ecl, 0.70, "ECL should trigger overload state")
        print(f"  [PASS] Composite ECL Index: {ecl:.4f} (Threshold: 0.70)")

    def test_progressive_disclosure_transformation(self):
        # 18 fields
        monolithic_form = {
            "type": "Form",
            "id": "enterprise-checkout",
            "children": [{"type": "Input", "id": f"field_{i}"} for i in range(18)]
        }
        healed_wizard = HeuristicTransformer.progressive_disclosure(monolithic_form, fields_per_step=6)
        self.assertEqual(healed_wizard["type"], "WizardContainer")
        self.assertEqual(healed_wizard["totalSteps"], 3)
        self.assertEqual(len(healed_wizard["children"]), 3)
        print("  [PASS] Progressive Disclosure: 18 fields transformed into 3-step Wizard")

if __name__ == "__main__":
    print("=" * 70)
    print(" AURAGEN FUNCTIONAL TESTING: COGNITIVE ENGINE & HEURISTICS")
    print("=" * 70)
    unittest.main(verbosity=1)
