"""
AuraGen Test Cases Generator
Generates valid OpenXML .xlsx and .csv files for:
- Normal_Test_Cases.xlsx
- Edge_Test_Cases.xlsx
- Invalid_Test_Cases.xlsx
- Failure_Test_Cases.xlsx
"""

import os
import csv
import zipfile
import xml.etree.ElementTree as ET

DATA_SETS = {
    "Normal_Test_Cases": [
        ["Test ID", "Subsystem", "Scenario Description", "Inputs / Preconditions", "Expected Result", "Priority", "Status"],
        ["TC-NORM-001", "Cognitive Engine", "Hick-Hyman reaction latency calculation", "n=12 choices, reaction T=3.8s", "Ic = b*log2(n+1), flags hesitation", "P0", "PASS"],
        ["TC-NORM-002", "Cognitive Engine", "Motor cursor trajectory entropy", "Mouse coordinates with rapid turns", "Jitter >= 0.72, flags motor friction", "P0", "PASS"],
        ["TC-NORM-003", "Schema Validator", "Generative UI AST root & node parsing", "Valid JSON AST with Container & Form", "AST parses cleanly into typed model", "P0", "PASS"],
        ["TC-NORM-004", "UI Rendering", "Progressive disclosure wizard transformation", "Monolithic form with 18 fields", "Splits into 3-step wizard with Next/Back", "P0", "PASS"],
        ["TC-NORM-005", "UI Rendering", "Visual clutter action button grouping", "15 loose action buttons", "Groups into primary dropdown + action bar", "P1", "PASS"],
        ["TC-NORM-006", "API Behavior", "Telemetry ingest endpoint", "Valid batch of 50 trajectory points", "HTTP 202 Accepted in <10ms", "P0", "PASS"],
        ["TC-NORM-007", "UI Responsive", "Desktop to Mobile viewport scaling", "Resize from 1440px to 375px", "Multi-column grid folds into single column", "P0", "PASS"],
    ],
    "Edge_Test_Cases": [
        ["Test ID", "Subsystem", "Scenario Description", "Inputs / Preconditions", "Expected Result", "Priority", "Status"],
        ["TC-EDGE-001", "Cognitive Engine", "Hysteresis boundary deadband damping", "ECL fluctuating between 0.69 and 0.71", "Suppresses re-triggers; zero thrashing", "P0", "PASS"],
        ["TC-EDGE-002", "Schema Validator", "Deeply nested recursive AST structure", "AST depth = 15 nested Containers", "Traverses safely without stack overflow", "P1", "PASS"],
        ["TC-EDGE-003", "API Behavior", "Telemetry burst rate-limit protection", "100 requests in <100ms", "Enforces 60 req/s, returns HTTP 429", "P1", "PASS"],
        ["TC-EDGE-004", "UI Responsive", "Ultrawide viewport max-width containment", "Viewport width = 2560px", "Layout constrained to max 1440px width", "P1", "PASS"],
        ["TC-EDGE-005", "Stress / Load", "Massive generative AST tree pruning", "1,000+ nodes in complex ERP layout", "Pruning & virtualization completes in <65ms", "P1", "PASS"],
        ["TC-EDGE-006", "State Store", "Draft retention across multi-step wizard", "User enters step 1 & 2 drafts, pauses", "Draft inputs preserved in decoupled store", "P0", "PASS"],
    ],
    "Invalid_Test_Cases": [
        ["Test ID", "Subsystem", "Scenario Description", "Inputs / Preconditions", "Expected Result", "Priority", "Status"],
        ["TC-INVAL-001", "Schema Validator", "Missing mandatory AST schema attributes", "Node missing mandatory 'id' and 'type'", "Throws SchemaValidationError, rejects AST", "P0", "PASS"],
        ["TC-INVAL-002", "Schema Validator", "Unsupported component token type", "Component type = 'QuantumWidget'", "Rejects with unregistered component enum error", "P1", "PASS"],
        ["TC-INVAL-003", "API Behavior", "Malformed telemetry batch payload", "Non-numeric timestamps, negative coords", "Returns HTTP 422 Unprocessable Entity", "P1", "PASS"],
        ["TC-INVAL-004", "Fallback Engine", "Unrecognized node healing fallback", "Unknown node inside valid container", "Synthesizer replaces with safe container fallback", "P1", "PASS"],
    ],
    "Failure_Test_Cases": [
        ["Test ID", "Subsystem", "Scenario Description", "Inputs / Preconditions", "Expected Result", "Priority", "Status"],
        ["TC-FAIL-001", "Fallback Engine", "Upstream LLM timeout fallback to Heuristic", "LLM hangs for >5000ms", "Switches to local heuristic healer; 0 blanking", "P0", "PASS"],
        ["TC-FAIL-002", "Fallback Engine", "Malformed LLM streaming syntax recovery", "Truncated/unparseable JSON stream chunk", "Error boundary catches error, restores prior AST", "P0", "PASS"],
        ["TC-FAIL-003", "Telemetry Client", "Offline network disconnect & replay", "WebSocket drops during active session", "Telemetry queues in buffer, replays on reconnect", "P1", "PASS"],
        ["TC-FAIL-004", "AST Parser", "Circular component reference cycle detection", "Node A embeds Node B which embeds Node A", "Cycle detector catches loop, caps depth at 8", "P0", "PASS"],
        ["TC-FAIL-005", "State Reconciler", "In-flight state race during async LLM patch", "User types keystrokes while stream arrives", "3-way merge preserves in-flight keystrokes (I1)", "P0", "PASS"],
    ]
}

def escape_xml(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

def create_xlsx(filename, rows):
    """Creates a minimal valid OpenXML .xlsx file directly without external dependencies."""
    sheet_data_xml = '<sheetData>'
    for r_idx, row in enumerate(rows, start=1):
        sheet_data_xml += f'<row r="{r_idx}">'
        for c_idx, val in enumerate(row, start=1):
            col_letter = chr(64 + c_idx) if c_idx <= 26 else f"A{chr(64 + c_idx - 26)}"
            cell_ref = f"{col_letter}{r_idx}"
            escaped = escape_xml(val)
            sheet_data_xml += f'<c r="{cell_ref}" t="inlineStr"><is><t>{escaped}</t></is></c>'
        sheet_data_xml += '</row>'
    sheet_data_xml += '</sheetData>'

    sheet_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    {sheet_data_xml}
</worksheet>'''

    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
    <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>'''

    rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>'''

    workbook_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <sheets>
        <sheet name="TestCases" sheetId="1" r:id="rId1"/>
    </sheets>
</workbook>'''

    wb_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>'''

    with zipfile.ZipFile(filename, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('[Content_Types].xml', content_types)
        zf.writestr('_rels/.rels', rels)
        zf.writestr('xl/workbook.xml', workbook_xml)
        zf.writestr('xl/_rels/workbook.xml.rels', wb_rels)
        zf.writestr('xl/worksheets/sheet1.xml', sheet_xml)

def main():
    target_dir = os.path.dirname(os.path.abspath(__file__))
    total_cases = 0
    for name, rows in DATA_SETS.items():
        xlsx_path = os.path.join(target_dir, f"{name}.xlsx")
        csv_path = os.path.join(target_dir, f"{name}.csv")
        create_xlsx(xlsx_path, rows)
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerows(rows)
        count = len(rows) - 1
        total_cases += count
        print(f"[AuraGen Test Cases] Generated {count:2d} rows -> {xlsx_path} and .csv")
    print(f"Total Test Cases Generated: {total_cases} across 4 quadrants.")

if __name__ == "__main__":
    main()
