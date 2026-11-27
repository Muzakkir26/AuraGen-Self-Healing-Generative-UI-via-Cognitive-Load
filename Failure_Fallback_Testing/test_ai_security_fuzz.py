# Failure_Fallback_Testing/test_ai_security_fuzz.py
import subprocess
import json

def test_via_real_babel_ast(jsx_code_snippet):
    """Executes Member-01's actual Babel validator via Node.js CLI"""
    node_inline_script = f"""
    const {{ validate }} = require('./ai/validator/astValidator');
    const result = validate(`{jsx_code_snippet}`);
    console.log(JSON.stringify(result));
    """
    proc = subprocess.run(["node", "-e", node_inline_script], capture_output=True, text=True)
    if proc.returncode == 0:
        return json.loads(proc.stdout)
    return {"passed": False, "violations": ["Process error"]}
