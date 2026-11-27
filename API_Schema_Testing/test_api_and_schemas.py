"""
AuraGen API Behavior & Schema Validation Test Suite
Subsystem: API Endpoints, Rate Limiting & AST Schema Enforcement
Covers: TC-NORM-003, TC-NORM-006, TC-EDGE-003, TC-INVAL-001, TC-INVAL-002, TC-INVAL-003
"""

import time
import unittest
from typing import Dict, Any, List

class SchemaValidationError(Exception):
    pass

class ASTSchemaValidator:
    ALLOWED_TYPES = {"Container", "Card", "Form", "Input", "Button", "Text", "WizardStep", "WizardContainer"}

    @classmethod
    def validate_node(cls, node: Dict[str, Any]) -> bool:
        if not isinstance(node, dict):
            raise SchemaValidationError("Node must be a JSON object dictionary")
        if "id" not in node or not isinstance(node["id"], str):
            raise SchemaValidationError("Node missing mandatory string attribute 'id'")
        if "type" not in node or not isinstance(node["type"], str):
            raise SchemaValidationError("Node missing mandatory string attribute 'type'")
        if node["type"] not in cls.ALLOWED_TYPES:
            raise SchemaValidationError(f"Unsupported component token '{node['type']}'")
        for child in node.get("children", []):
            cls.validate_node(child)
        return True

class MockTelemetryAPI:
    def __init__(self, burst_limit: int = 60):
        self.burst_limit = burst_limit
        self.request_timestamps: List[float] = []

    def ingest_telemetry(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        now = time.time()
        self.request_timestamps = [t for t in self.request_timestamps if now - t < 1.0]
        if len(self.request_timestamps) >= self.burst_limit:
            return {"status": 429, "error": "Rate limit exceeded. Burst cap is 60 req/s", "retry_after": 1}
        self.request_timestamps.append(now)

        if not isinstance(payload, dict) or "events" not in payload:
            return {"status": 422, "error": "Missing 'events' in telemetry payload"}
        for ev in payload["events"]:
            if not isinstance(ev.get("t"), (int, float)) or ev.get("t", -1) < 0:
                return {"status": 422, "error": "Invalid or negative timestamp in telemetry point"}
            if not isinstance(ev.get("x"), (int, float)) or not isinstance(ev.get("y"), (int, float)):
                return {"status": 422, "error": "Coordinates (x, y) must be numeric"}
        return {"status": 202, "message": "Telemetry batch accepted for stream processing"}

class TestAPISchema(unittest.TestCase):
    def setUp(self):
        self.api = MockTelemetryAPI(burst_limit=60)

    def test_valid_ast_schema(self):
        valid_ast = {
            "id": "root-container",
            "type": "Container",
            "children": [
                {"id": "card-1", "type": "Card", "children": [{"id": "btn-1", "type": "Button"}]}
            ]
        }
        self.assertTrue(ASTSchemaValidator.validate_node(valid_ast))
        print("  [PASS] AST Schema: Valid component tree validated successfully")

    def test_missing_mandatory_id(self):
        invalid_ast = {"type": "Container"}
        with self.assertRaises(SchemaValidationError):
            ASTSchemaValidator.validate_node(invalid_ast)
        print("  [PASS] AST Schema: Correctly caught missing 'id' error")

    def test_unregistered_component_token(self):
        invalid_ast = {"id": "widget-99", "type": "QuantumWidget"}
        with self.assertRaises(SchemaValidationError):
            ASTSchemaValidator.validate_node(invalid_ast)
        print("  [PASS] AST Schema: Correctly rejected unregistered component 'QuantumWidget'")

    def test_telemetry_api_ingest_success(self):
        payload = {"events": [{"x": 120.5, "y": 340.0, "t": 1000.0}]}
        res = self.api.ingest_telemetry(payload)
        self.assertEqual(res["status"], 202)
        print("  [PASS] API Ingest: Returns HTTP 202 Accepted on valid telemetry payload")

    def test_telemetry_api_malformed_payload(self):
        bad_payload = {"events": [{"x": "bad-coord", "y": 100, "t": -50}]}
        res = self.api.ingest_telemetry(bad_payload)
        self.assertEqual(res["status"], 422)
        print("  [PASS] API Ingest: Returns HTTP 422 Unprocessable Entity on bad data types")

    def test_telemetry_rate_limiting_burst(self):
        for _ in range(60):
            self.api.ingest_telemetry({"events": [{"x": 0, "y": 0, "t": 0}]})
        blocked = self.api.ingest_telemetry({"events": [{"x": 0, "y": 0, "t": 0}]})
        self.assertEqual(blocked["status"], 429)
        print("  [PASS] API Rate Limiting: Returns HTTP 429 after exceeding 60 req/s burst limit")

if __name__ == "__main__":
    print("=" * 70)
    print(" AURAGEN API BEHAVIOR & SCHEMA VALIDATION TESTS")
    print("=" * 70)
    unittest.main(verbosity=1)
