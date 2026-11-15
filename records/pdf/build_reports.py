"""
Builds the AuraGen progress reports (PDF): one team overview plus one per member,
each with a completion score, plain-language summary, timeline, gaps and viva questions.

Run from the repo root:  python records/pdf/build_reports.py
Requires: pip install reportlab

Update the DATA section below after each work session, then re-run.
People are referred to by role only.
"""

import os
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle)

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
AS_OF = "15 November 2026"

# ---------------------------------------------------------------- fonts & styles
FONT_DIR = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts")
try:
    pdfmetrics.registerFont(TTFont("Body", os.path.join(FONT_DIR, "arial.ttf")))
    pdfmetrics.registerFont(TTFont("Body-Bold", os.path.join(FONT_DIR, "arialbd.ttf")))
    pdfmetrics.registerFont(TTFont("Body-Italic", os.path.join(FONT_DIR, "ariali.ttf")))
    pdfmetrics.registerFont(TTFont("Body-BoldItalic", os.path.join(FONT_DIR, "arialbi.ttf")))
    pdfmetrics.registerFont(TTFont("Mono", os.path.join(FONT_DIR, "consola.ttf")))
    pdfmetrics.registerFontFamily("Body", normal="Body", bold="Body-Bold", italic="Body-Italic", boldItalic="Body-BoldItalic")
    BODY, BOLD, MONO = "Body", "Body-Bold", "Mono"
except Exception:  # non-Windows fallback
    BODY, BOLD, MONO = "Helvetica", "Helvetica-Bold", "Courier"

INK = colors.HexColor("#1f2933")
MUTED = colors.HexColor("#616e7c")
ACCENT = colors.HexColor("#3949ab")
ACCENT_SOFT = colors.HexColor("#e8eaf6")
RULE = colors.HexColor("#d9dee5")
GREEN, GREEN_SOFT = colors.HexColor("#2e7d32"), colors.HexColor("#e8f5e9")
AMBER, AMBER_SOFT = colors.HexColor("#b26a00"), colors.HexColor("#fff4e0")
RED, RED_SOFT = colors.HexColor("#c62828"), colors.HexColor("#fdecea")

S = {
    "title": ParagraphStyle("title", fontName=BOLD, fontSize=22, leading=27, textColor=colors.white),
    "subtitle": ParagraphStyle("subtitle", fontName=BODY, fontSize=11, leading=15, textColor=colors.HexColor("#dfe3f6")),
    "h1": ParagraphStyle("h1", fontName=BOLD, fontSize=14, leading=18, textColor=ACCENT, spaceBefore=12, spaceAfter=6),
    "h2": ParagraphStyle("h2", fontName=BOLD, fontSize=11, leading=14, textColor=INK, spaceBefore=8, spaceAfter=4),
    "body": ParagraphStyle("body", fontName=BODY, fontSize=9.5, leading=13.5, textColor=INK, spaceAfter=4),
    "small": ParagraphStyle("small", fontName=BODY, fontSize=8, leading=11, textColor=MUTED),
    "cell": ParagraphStyle("cell", fontName=BODY, fontSize=8.5, leading=11.5, textColor=INK),
    "cellb": ParagraphStyle("cellb", fontName=BOLD, fontSize=8.5, leading=11.5, textColor=INK),
    "head": ParagraphStyle("head", fontName=BOLD, fontSize=8.5, leading=11, textColor=colors.white),
    "bullet": ParagraphStyle("bullet", fontName=BODY, fontSize=9.5, leading=13.5, textColor=INK, leftIndent=12, bulletIndent=2, spaceAfter=2),
    "q": ParagraphStyle("q", fontName=BOLD, fontSize=9.5, leading=13, textColor=INK, spaceBefore=6),
    "a": ParagraphStyle("a", fontName=BODY, fontSize=9, leading=12.8, textColor=colors.HexColor("#334155"), leftIndent=14, spaceAfter=2),
    "big": ParagraphStyle("big", fontName=BOLD, fontSize=30, leading=34, textColor=ACCENT, alignment=TA_CENTER),
    "bigcap": ParagraphStyle("bigcap", fontName=BODY, fontSize=8.5, leading=11, textColor=MUTED, alignment=TA_CENTER),
}

STATUS = {  # label, credit, fg, bg
    "done": ("Done", 1.0, GREEN, GREEN_SOFT),
    "mostly": ("Mostly done", 0.75, GREEN, GREEN_SOFT),
    "partial": ("Partial", 0.5, AMBER, AMBER_SOFT),
    "started": ("Started", 0.25, AMBER, AMBER_SOFT),
    "todo": ("Not started", 0.0, RED, RED_SOFT),
}


def code(t):
    return f'<font name="{MONO}" size="8.5">{t}</font>'


def P(text, style="body"):
    return Paragraph(text, S[style])


def table(rows, widths, header=True, zebra=True, extra=None):
    data = [[c if not isinstance(c, str) else P(c, "head" if (header and i == 0) else "cell") for c in row] for i, row in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, RULE),
    ]
    if header:
        style.append(("BACKGROUND", (0, 0), (-1, 0), ACCENT))
    if zebra:
        for r in range(1 if header else 0, len(rows)):
            if r % 2 == 0:
                style.append(("BACKGROUND", (0, r), (-1, r), colors.HexColor("#f7f8fb")))
    style += extra or []
    t.setStyle(TableStyle(style))
    return t


def banner(title, subtitle):
    t = Table([[P(title, "title")], [P(subtitle, "subtitle")]], colWidths=[180 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), ACCENT),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, 0), 12), ("BOTTOMPADDING", (0, -1), (-1, -1), 12),
    ]))
    return t


def meter(pct, caption):
    """A percentage figure plus a 20-segment bar."""
    filled = round(pct / 5)
    colour = GREEN if pct >= 70 else AMBER if pct >= 40 else RED
    bar = Table([[""] * 20], colWidths=[6 * mm] * 20, rowHeights=[4 * mm])
    bar.setStyle(TableStyle([("BACKGROUND", (i, 0), (i, 0), colour if i < filled else RULE) for i in range(20)] +
                            [("LINEAFTER", (i, 0), (i, 0), 1.2, colors.white) for i in range(20)]))
    t = Table([[P(f"{pct}%", "big")], [bar], [P(caption, "bigcap")]], colWidths=[180 * mm])
    t.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER"), ("TOPPADDING", (0, 0), (-1, -1), 2)]))
    return t


def score(deliverables):
    total = sum(STATUS[d[2]][1] for d in deliverables)
    return round(100 * total / len(deliverables))


def deliverable_table(deliverables):
    rows = [["Deliverable", "When due", "Status", "Evidence / note"]]
    extra = []
    for i, (name, week, st, note) in enumerate(deliverables, start=1):
        label, _, fg, bg = STATUS[st]
        rows.append([name, week, f'<font color="{fg.hexval()}"><b>{label}</b></font>', note])
        extra.append(("BACKGROUND", (2, i), (2, i), bg))
    return table(rows, [52 * mm, 20 * mm, 22 * mm, 86 * mm], extra=extra)


def bullets(items):
    return [Paragraph(i, S["bullet"], bulletText="\u2022") for i in items]


def viva(groups):
    out = [P("How to use this section: read the question, answer it aloud in your own words, then compare with the model answer. "
             "Examiners usually ask you to <b>explain your own code</b>, <b>justify a design choice</b> and <b>say what you would improve</b>.", "small")]
    n = 0
    for title, qas in groups:
        out.append(P(title, "h2"))
        for q, a in qas:
            n += 1
            out.append(KeepTogether([P(f"Q{n}. {q}", "q"), P(a, "a")]))
    return out


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(BODY, 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(15 * mm, 10 * mm, f"AuraGen: Self-Healing Generative UI · {doc.report_name} · status as of {AS_OF}")
    canvas.drawRightString(195 * mm, 10 * mm, f"Page {doc.page}")
    canvas.setStrokeColor(RULE)
    canvas.line(15 * mm, 13 * mm, 195 * mm, 13 * mm)
    canvas.restoreState()


def build(filename, report_name, story):
    path = os.path.join(OUT_DIR, filename)
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm, topMargin=14 * mm, bottomMargin=18 * mm,
                            title=f"AuraGen: {report_name}", author="AuraGen team", subject="Internship progress report")
    doc.report_name = report_name
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return path


RUBRIC = ("<b>How the percentage is calculated:</b> every deliverable this role owns for the whole month (Weeks 1–4, from the official "
          "project plan and the team contracts) counts equally. Done = 1, Mostly done = 0.75, Partial = 0.5, Started = 0.25, "
          "Not started = 0. The score is the average. It measures progress towards the <b>final</b> review, so 100% is not expected yet. "
          "It is an estimate made from the code in the repository, not an official grade.")

# ======================================================================== DATA

MEMBERS = {}

# ------------------------------------------------------------------ Member-01
MEMBERS["Member-01"] = dict(
    file="Member-01_Report.pdf",
    role="Team Lead · AI/LLM layer, code validation, integration",
    one_line="Builds the “brain and safety guard” of AuraGen: the instructions the LLM follows, the pipeline that asks it for a "
             "component, and the security check every piece of AI-written code must pass before it can reach a browser.",
    responsibilities=[
        "Design the interface contracts that let frontend, backend, AI and tests fit together.",
        "Week 1: Code-Gen prompting. Build the LangChain pipeline and teach the LLM our component library.",
        "Week 2: Safety and compilation. Babel parsing layer that blocks broken or malicious code.",
        "Week 3: Generation audit (prove output is consistently valid) and contextual awareness (keep the user's typed data).",
        "Week 4: Latency optimisation. Caching and streaming, target under 2 seconds.",
        "Team Lead: review and merge pull requests, keep the team on schedule, integrate the modules.",
    ],
    deliverables=[
        ("Interface contracts and project README", "W1", "done", f"{code('docs/contracts.md')} v0.3, README, {code('.env.example')}"),
        ("LangChain prompt pipeline (W1)", "W1", "done", f"{code('ai/agent/prompt.js')}, {code('codeGenAgent.js')}, few-shot example"),
        ("Babel AST validator and compiler (W2)", "W2", "done", f"{code('ai/validator/*')}, 20 security tests"),
        ("Backend integration endpoint", "W2", "done", f"{code('POST /api/generate')}, tested on a live server"),
        ("Mock LLM for key-free demos", "W2", "done", "Writes valid wizards for 5 field types"),
        ("Generation audit (W3)", "W3", "partial", "Tool and mock run done. Real GPT-4o run waits for the API key"),
        ("Contextual awareness (W3)", "W3", "partial", "Privacy-safe prompt done. End-to-end data preservation needs the renderer"),
        ("Latency: cache and streaming (W4)", "W4", "partial", "Cache done (hit ≈ 1 ms). Token streaming not started"),
        ("Trigger wiring: score ≥ 70 → generate", "W3", "todo", "Joint task with Member-03"),
        ("Team Lead: PR reviews, merges, Work Distribution Document", "ongoing", "started", "Records and reports done. Own PR not merged yet"),
    ],
    built=[
        ("Interface contracts", "The agreed message formats between all parts of the system, with a version history.", "docs/contracts.md"),
        ("Design system list", "One list of approved components, HTML tags, hooks and banned words. The prompt and the validator both read it, so they can never disagree.", "ai/designSystem.js"),
        ("AST safety validator", "Reads AI code as a syntax tree and rejects imports, browser globals (window, fetch, eval…), unknown components, prototype tricks, loops and unsafe attributes. Reports every problem with a line number.", "ai/validator/astValidator.js"),
        ("Compiler", "Turns safe JSX into a plain function the browser can run, with all dangerous globals hidden as a second safety net.", "ai/validator/compile.js"),
        ("Prompt builder", "Writes the instructions for the LLM: the components, the rules, a correct example, the stuck field and how the user is struggling. Never includes what the user typed.", "ai/agent/prompt.js"),
        ("Code-Gen Agent", "LangChain pipeline: ask the LLM, extract the code, validate, and if unsafe send the problems back for one repair. Always returns ok, rejected or error.", "ai/agent/codeGenAgent.js"),
        ("Model switch and mock LLM", "Uses GPT-4o when a key is set, otherwise a built-in generator so the team can demo now.", "ai/agent/llm.js, templates.js"),
        ("Cache", "Remembers generated components. The next user stuck on the same field gets one in about 1 ms.", "ai/agent/cache.js"),
        ("Generate endpoint", "POST /api/generate: stuck field in, compiled component (or fallback message) out. One generation per field every 30 s.", "server/routes/generateRoute.js"),
        ("Generation audit", "Runs sample fields many times and reports valid-rate, latency and the most common failures.", "ai/audit/runAudit.js"),
        ("Team records and reports", "Plain-language record of every branch, these PDF reports, and a progress log.", "records/, docs/progress-member-01.md"),
    ],
    flow=[
        "The backend sends a <b>generation request</b>: the stuck field, the form schema and the friction signals.",
        "The <b>prompt builder</b> turns it into instructions. Field values are replaced by “filled” or “empty”.",
        "The <b>cache</b> is checked. If the same prompt was answered recently, the stored component is reused.",
        "The <b>LLM</b> (GPT-4o, or the mock) writes a React component.",
        "The <b>validator</b> parses it into an AST and checks every rule. If it fails, the violations go back to the LLM for one repair.",
        "The <b>compiler</b> turns the safe JSX into a function body, and the backend returns <b>ui.generated</b> (or <b>ui.fallback</b>) for the browser.",
    ],
    timeline=[
        ("9 Nov", "Created the repository"),
        ("10 Nov", "README, contracts v0.1, env template; replaced sample personal data with placeholders"),
        ("15 Nov", "AST validator and compiler (20 tests), contracts v0.2, progress log"),
        ("15 Nov", "Prompt builder, repair prompt, code extractor; team records folder"),
        ("15 Nov", "Merged main; Code-Gen Agent, mock LLM, cache, /api/generate, audit (44 tests); contracts v0.3"),
    ],
    commit_days="3 days (9, 10 and 15 Nov)",
    gaps=[
        "<b>Commit days:</b> only 3 so far. The mid review needs commits on 10 of the previous 14 days, so commit every day from 16 Nov.",
        "<b>Open the PR</b> Member-01 → main so the AI layer is on the shared branch before the mid review.",
        "<b>Wire the trigger</b> with Member-03: when the score reaches 70, call /api/generate.",
        "<b>Real-model audit</b> once the mentor approves the API key, then tune the prompt on the most common violations.",
        "<b>Token streaming</b> for the Week 4 latency goal.",
        "<b>Team Lead duties:</b> enforce PR review on main, prepare the Work Distribution Document before the mid review.",
    ],
    viva=[
        ("Concepts", [
            ("What problem does AuraGen solve, and where does your part fit?",
             "Static forms don't adapt when a user is confused. AuraGen measures friction (cursor movement, hesitation, rage clicks), and when the score is high it has an LLM write a simpler step-by-step component for that exact field. My part turns “the user is stuck here” into a safe, compiled React component: prompt, LLM pipeline, validation and compilation, plus integration of all modules."),
            ("What is an Abstract Syntax Tree, and why validate with an AST instead of regular expressions?",
             "An AST is the tree structure a parser builds from source code: every node is a statement, expression, identifier or JSX element. Regex sees only text, so it is fooled by spacing, comments, strings or tricks like <i>window[\"fe\"+\"tch\"]</i>. On an AST I can ask precise questions: is this identifier a real reference or just an object key? Is this member access computed? Is this a JSX tag outside the allowed list?"),
            ("Why do you treat LLM output as untrusted?",
             "The model can make mistakes, hallucinate components, or be steered by prompt injection. Its code runs in the user's browser, so one malicious line could steal data or call APIs. So nothing is compiled unless it passes the validator, and the compiled code still runs with dangerous globals shadowed."),
            ("Explain the full generation pipeline end to end.",
             "Request → prompt builder → cache lookup → LangChain chat model → extract the code block → AST validation → on failure, one repair round with the violation list → compile with Babel → return a contracts §4 result → the backend converts it to a ui.generated or ui.fallback message for the browser."),
        ]),
        ("Your implementation", [
            ("How does the validator block window but still allow an object like { location: \"Pune\" }?",
             "For every Identifier with a banned name, it checks the parent node. If the identifier is the key of a non-computed object property, or the property side of a non-computed member access (a.location), it is just a name, not a reference to the global, so it is allowed. Anywhere else it is reported as banned-identifier."),
            ("How do you stop a prototype-chain escape such as onChange.constructor.constructor(\"code\")()?",
             "Three layers. (1) Property names like constructor, prototype and __proto__ are banned. (2) Computed access with a runtime key, which could spell “constructor”, is allowed only on the values prop or on a local const array/object literal, and the result can never be called directly. (3) The compiled code runs inside new Function with every banned global passed in as an undefined parameter."),
            ("Why only useState and useMemo?",
             "Those two are pure: they hold or derive values. useEffect can run arbitrary side effects and timers, and useRef gives direct DOM access. The wizard doesn't need them, and banning them shrinks the attack surface."),
            ("What does the compiler output, and how does the renderer run it?",
             "A strict-mode function body: the export is removed and “return ComponentName;” is added, and JSX becomes React.createElement calls. The renderer runs new Function(...RUNTIME_PARAMS, compiled) and passes React, the two hooks and the approved components, with undefined for every shadowed global. The result is the component function."),
            ("How does the repair loop work, and why only one retry?",
             "If validation fails, the agent appends the model's answer plus a message listing each violation with its line, and asks again. One retry fixes most simple mistakes, but each call costs latency and money, and the user is waiting. If it still fails, the status is rejected and the frontend shows the pre-built static wizard."),
            ("What happens if the LLM hangs or the API key is wrong?",
             "Every call has a timeout (a Promise.race plus an AbortSignal). Errors are caught and turned into status “error” with a reason prefix (timeout, llm-failure, bad-request). The agent never throws, so the server never crashes and the user always gets the fallback."),
            ("How do you preserve the user's typed data without sending it to the LLM?",
             "The prompt only says whether each field is filled or empty. The generated component reads real values from the values prop and writes through onChange(fieldId, value), and ui.generated carries initialValues. So typed data survives the swap and personal data never leaves our server."),
            ("Why is it safe to share the cache between different users?",
             "Because the prompt contains no personal data. The key is a SHA-256 of prompt version, design-system version, model name, system prompt and user prompt. Two users stuck on the same field with the same signals build the same prompt and can reuse the same component. The cache is LRU with a time-to-live, so it stays small and fresh."),
            ("Why did you build a mock LLM?",
             "The API key needs mentor approval, and the team can't wait for it to integrate. The mock is a real LangChain SimpleChatModel, so the agent code path is identical. It writes valid wizards for text, number, select, date and checkbox fields, which also makes the tests deterministic."),
            ("What is the cooldown on /api/generate?",
             "One generation per session and field every 30 seconds (GENERATION_COOLDOWN_MS). It prevents repeated calls while the score stays high, which saves cost and stops the UI from flickering. A blocked call returns HTTP 429 with a ui.fallback message."),
        ]),
        ("Testing and evaluation", [
            ("How did you test your work?",
             "44 automated tests with node:test: valid components, every banned identifier, escape attempts, JSX and attribute rules, compile-and-execute checks inside a fake React runtime, prompt content and privacy, the repair loop with LangChain's FakeListChatModel, timeouts, LLM failures, cache behaviour, and a mock run for every field type. Plus a live smoke test of the endpoint (200, 429, 400 and cache-hit cases)."),
            ("What does the generation audit measure, and why is the current 100% not a quality claim?",
             "It runs every sample field N times and reports valid on first try, valid after repair, rejections, errors, mean and p95 latency, and a histogram of violations. The current report uses the mock, which is designed to be correct, so it only proves the pipeline works. Real numbers come from re-running it with GPT-4o, and the report says this at the top."),
        ]),
        ("Design decisions and limitations", [
            ("Why generate React code instead of a JSON layout description?",
             "The project specification requires LLM-generated React code compiled through Babel. JSON would be easier to secure, so we got close to that safety by restricting the code: an allow-list of components and hooks, no imports, no globals, literal Tailwind classes, plus runtime shadowing."),
            ("Why LangChain?",
             "It gives one interface for chat models and messages, so switching between GPT-4o, another provider or the mock is a one-line change. It also provides test doubles (FakeListChatModel) and supports streaming, which we need in Week 4."),
            ("What are the limitations of your security approach, and what would you add?",
             "Static analysis can never fully sandbox JavaScript. That is why there is a second runtime layer. For production I would also run generated components inside a sandboxed iframe with a strict Content-Security-Policy, add a timeout guard on rendering, and keep a regression set of real attack samples."),
            ("How will you reach the under-2-second target?",
             "The cache for repeated friction points (already about 1 ms on a hit), a short system prompt, low temperature, streaming tokens so validation can start as soon as the code block closes, and pre-generating wizards for the hardest fields."),
        ]),
        ("Team Lead", [
            ("How do you coordinate four people working in parallel?",
             "One branch per member, each in their own folder; versioned interface contracts so parts fit; pull requests into main reviewed by the Team Lead; a progress log and per-branch records; and daily small commits."),
            ("What integration risks did you find, and how are you handling them?",
             "The frontend and backend have two different scoring formulas, the running code uses a REST payload that differs from the contracts, and the test suite was written against mock code rather than the real modules. I documented these in the records and proposed fixes: one scoring source, update the contract to the agreed payload, and rewrite the tests against the real code."),
        ]),
    ],
)

# ------------------------------------------------------------------ Member-02
MEMBERS["Member-02"] = dict(
    file="Member-02_Report.pdf",
    role="Frontend / UI · components, telemetry capture, dynamic rendering, animation",
    one_line="Builds everything the user sees: the complex financial form, the hook that measures how the user moves and clicks, "
             "and (still to come) the renderer that swaps in the AI-generated wizard.",
    responsibilities=[
        "Week 1: Telemetry tracker. A React hook that measures mouse velocity, hesitation and click patterns and streams them over WebSockets.",
        "Week 2: Dynamic injection. A rendering shell that takes a string of compiled code and renders it without a page refresh.",
        "Week 3: Telemetry check. Show that the cognitive load score really spikes during simulated confusion.",
        "Week 4: Morphing animation with Framer Motion, plus fallback states when generation fails.",
        "Build the approved component library from contracts §7 (Wizard, WizardStep, TextField, …).",
    ],
    deliverables=[
        ("Next.js app and complex financial form", "W1", "done", f"{code('src/app')}, {code('ComplexFinancialForm.tsx')}"),
        ("Telemetry hook with WebSocket + HTTP fallback (W1)", "W1", "done", f"{code('useCognitiveTelemetry.ts')}: speed, pause, rage clicks, decay"),
        ("Debug HUD and normal/debug modes", "W1", "done", f"{code('TelemetryMonitorHUD.tsx')}, ?debug=true"),
        ("Approved component library (contracts §7)", "W2", "started", "Basic Button, Card, Input, ProgressBar. Wizard/WizardStep/TextField… missing"),
        ("Dynamic renderer: compile string → component (W2)", "W2", "todo", "Needed for the mid-review demo"),
        ("Score-spike validation (W3)", "W3", "partial", "Simulation buttons and contract test exist. No recorded evidence yet"),
        ("Typed data preserved through the swap (W3)", "W3", "todo", "Pass values/onChange and initialValues to the generated component"),
        ("Morphing animation with Framer Motion (W4)", "W4", "todo", ""),
        ("Fallback states: static wizard, error boundary (W4)", "W4", "todo", ""),
    ],
    built=[
        ("Next.js + Tailwind app", "The website and its styling setup.", "src/app/*, tailwind.config.js"),
        ("Complex financial form", "The deliberately hard “before” form that users struggle with.", "src/components/portal/ComplexFinancialForm.tsx"),
        ("Telemetry hook", "Measures mouse speed (smoothed, drops to 0 within 250 ms of stopping), pause time on the focused field, and rage clicks (fast clicks close together, decaying by 1 every 2 s). Streams every 0.8 s over WebSocket and switches to HTTP if the socket drops.", "src/hooks/useCognitiveTelemetry.ts"),
        ("Telemetry HUD", "A dockable developer panel with live signals, score, connection state and a contract inspector. Hidden for normal users.", "src/components/telemetry/TelemetryMonitorHUD.tsx"),
        ("UI kit", "Badge, Button, Card, Input, ProgressBar.", "src/components/ui/*"),
        ("Local scoring + API route", "A reference score calculation and a /api/telemetry route for frontend testing.", "src/lib/scoring.ts, src/app/api/telemetry/route.ts"),
        ("Mock WebSocket server + contract test", "Lets the frontend run and be checked without the real backend.", "scripts/mock-ws-server.js, test-contract.js"),
    ],
    flow=[
        "The user works on the form. The hook listens to pointer moves, clicks, focus and typing.",
        "Every 0.8 s it sends {mouseSpeed, pauseTime, rageClicks, fieldName, userInput} over WebSocket, or over HTTP if the socket is down.",
        "The backend replies with a score and triggerAI. The HUD shows it in debug mode.",
        "<i>Still to build:</i> when triggerAI is true, receive ui.generated, run the compiled code with the approved components, and animate the swap.",
    ],
    timeline=[
        ("10 Nov", "Added the full frontend (form, UI kit, hook, HUD); fixed field-level hesitation, WebSocket streaming and error states"),
        ("11 Nov", "Restyled the form, header and global CSS"),
        ("12 Nov", "Button and Next.js config changes"),
        ("13 Nov", "Improved the hook, hid the HUD in normal mode, added form validation and docs"),
        ("14 Nov", "Merged main into the branch; PR #5 merged into main"),
    ],
    commit_days="5 days (10–14 Nov)",
    gaps=[
        "<b>Dynamic renderer</b> is the most important missing piece for the mid-review demo. Instructions are in ai/README.md.",
        "<b>Approved components</b> from contracts §7 must exist before generated wizards can render.",
        "<b>Privacy:</b> the payload sends userInput (the actual typed value). The contract says to send only the length.",
        "<b>Two scoring formulas:</b> src/lib/scoring.ts differs from the backend's. Agree on one.",
        "<b>Commit messages</b> such as “frontend changed” should say what changed.",
    ],
    viva=[
        ("Concepts", [
            ("What does your telemetry hook measure, and why are these good signs of confusion?",
             "Mouse speed (erratic or fast movement suggests searching), pause time on the focused field (hesitation suggests the user doesn't know what to enter) and rage clicks (repeated fast clicks in one spot show frustration). Together they approximate cognitive load without reading what the user types."),
            ("Why stream over WebSocket, and why keep an HTTP fallback?",
             "A WebSocket keeps one open connection, so small messages every 0.8 s are cheap and the server can push back (for example, a generated UI). If the socket drops, HTTP POST keeps telemetry flowing until it reconnects, so tracking never silently stops."),
            ("What is React Suspense, and what is an Error Boundary?",
             "Suspense shows a fallback while a component is loading. An Error Boundary is a component that catches render errors in its children and shows fallback UI instead of crashing the page. The renderer needs both: Suspense while code loads, and an Error Boundary in case generated code throws."),
        ]),
        ("Your implementation", [
            ("How is mouse speed calculated, and why does it drop to zero?",
             "Distance between pointer positions divided by elapsed time, smoothed with an exponential moving average. A 250 ms timer resets it to 0 once the cursor stops, so a still cursor isn't reported as moving."),
            ("How do you detect a rage click?",
             "Clicks are stored with position and time. Clicks within about 45 px of each other and within about 700 ms count as a burst. The count decays by 1 every 2 seconds of calm, so the score can return to its baseline."),
            ("Why does the hook use refs as well as state?",
             "The streaming interval reads the latest values. If it read state, the interval closure would hold stale values or have to be recreated on every change. Refs hold the current value without causing re-renders. State is kept for what the UI must display."),
            ("What is the difference between normal mode and debug mode?",
             "Normal users see only the clean form, and tracking runs silently. Debug mode (?debug=true or an env flag) shows the HUD, connection badge and contract inspector for developers and reviewers."),
            ("What is the payload contract between your hook and the backend?",
             "Request: mouseSpeed, pauseTime, rageClicks, fieldName, userInput. Response: success, score, triggerAI, stuckField, savedValue. Wrong keys or types get HTTP 400."),
        ]),
        ("What you will build next", [
            ("How will you render a component that arrives as a string of code?",
             "Take the compiled string from ui.generated, build it with new Function(...RUNTIME_PARAMS, compiled), and pass React, useState, useMemo and the approved components (undefined for the shadowed globals). Render the result inside Suspense and an Error Boundary whose fallback is the static wizard."),
            ("How will you make sure the user's typed data is not lost when the form morphs?",
             "Keep form values in one parent state. Pass them to the generated component as the values prop and update them through onChange(fieldId, value). Seed them from initialValues in the ui.generated message. The old and new UIs then share one source of truth."),
            ("How would you animate the swap with Framer Motion?",
             "Wrap the static and generated UIs in AnimatePresence, give each an exit and enter animation (fade plus a slight slide or scale), and use layout animations so the height changes smoothly. Keep it under about 300 ms and honour prefers-reduced-motion."),
            ("Why should generated components only use the approved library?",
             "Consistent look, accessibility built in once, and security: the validator can only reason about a known, small set of components and props."),
        ]),
        ("Quality and improvements", [
            ("Is there a privacy issue in the current payload?",
             "Yes. userInput sends the actual typed value. The team contract says to send only the length, never the value. Fixing it means sending inputLength instead and keeping values in the browser."),
            ("How would you prove the score really spikes during confusion (Week 3)?",
             "Script simulated sessions (calm typing, then rage clicks, long pauses and erratic movement), record the score timeline, and show it crosses 70 only in the confused segments. Save the charts and a screen recording as evidence."),
            ("How do you keep the telemetry hook from hurting performance?",
             "Throttle pointer events, keep the hot values in refs to avoid re-renders, batch into one message per interval, and clean up all listeners and timers when the component unmounts."),
        ]),
    ],
)

# ------------------------------------------------------------------ Member-03
MEMBERS["Member-03"] = dict(
    file="Member-03_Report.pdf",
    role="Backend / API · WebSocket server, scoring, request validation, configuration",
    one_line="Builds the server that receives behaviour data, checks it, calculates a frustration score, and decides when the AI should step in.",
    responsibilities=[
        "Set up the Node.js/Express backend and its configuration.",
        "Receive telemetry, validate it, and compute the Cognitive Load Score.",
        "Run the WebSocket server that streams scores and pushes generated UI to the browser.",
        "Apply the trigger rule (score high for 3 s, then a 30 s cool-down) and call the AI layer.",
        "Error handling, logging and basic API security.",
    ],
    deliverables=[
        ("Express server, health check, env config", "W1", "done", f"{code('server/index.js')}, dotenv"),
        ("Telemetry endpoint with input validation", "W1", "done", f"{code('POST /api/telemetry')}, 400 on bad input"),
        ("Cognitive Load Score calculation", "W1", "partial", "Works, but step-based (0/30/40/70/100), not the weighted formula in the contract"),
        ("Global error handler and request logger", "W2", "done", f"{code('server/middleware/*')}"),
        ("WebSocket server (stream scores, push UI)", "W2", "todo", "Frontend currently talks to a mock WebSocket server"),
        ("Trigger rule: high for 3 s, then 30 s cool-down", "W3", "todo", "Cool-down exists in /api/generate. Hold rule missing"),
        ("Call the AI layer when triggerAI is true", "W3", "todo", "/api/generate is ready to call"),
        ("API hardening: rate limit, CORS, body limits", "W4", "started", "Validation and error handler in place"),
    ],
    built=[
        ("Express server", "Starts the backend, parses JSON and exposes a /health check.", "server/index.js"),
        ("Telemetry endpoint", "POST /api/telemetry takes mouseSpeed, pauseTime, rageClicks, fieldName and userInput, and returns score, triggerAI (true at score ≥ 70), stuckField and savedValue.", "server/routes/healRoute.js"),
        ("Score calculation", "Adds points: mouse speed over 100 → +30, pause over 4 s → +40, 3 or more rage clicks → +30.", "server/telemetryService.js"),
        ("Input validation", "Rejects missing or wrong-type fields with a clear 400 error.", "server/telemetryService.js"),
        ("Global error handler", "Catches unexpected errors and returns a clean JSON error instead of crashing.", "server/middleware/errorHandler.js"),
        ("Request logger", "Logs method, path, status and response time for every request.", "server/middleware/logger.js"),
    ],
    flow=[
        "The browser POSTs telemetry to /api/telemetry.",
        "The data is validated. Bad data gets a 400 with a reason.",
        "The score is calculated. triggerAI is true when it reaches 70.",
        "The response goes back to the browser, and the logger records the request and its timing.",
        "<i>Still to build:</i> when triggerAI is true, call /api/generate and push the ui.generated message to the browser over WebSocket.",
    ],
    timeline=[
        ("9 Nov", "Initialised the Node project; installed Express and dotenv"),
        ("10 Nov", "Started the backend server"),
        ("11 Nov", "Cognitive score calculation"),
        ("12 Nov", "Input validation function"),
        ("13 Nov", "POST /api/heal-ui endpoint"),
        ("14 Nov", "Global error handler; cleaned up routes"),
        ("15 Nov", "Request logger with response timing"),
    ],
    commit_days="7 days (9–15 Nov). The most consistent on the team.",
    gaps=[
        "<b>Connect to the AI layer:</b> call /api/generate when triggerAI is true. This is the key link for the mid-review demo.",
        "<b>WebSocket server:</b> the frontend expects ws://…/ws/telemetry, which only the mock server provides today.",
        "<b>Scoring:</b> move to the weighted, normalised formula in the contract (rage 0.35, hesitation 0.25, errors 0.25, velocity 0.15), and agree with Member-02 on one implementation.",
        "<b>Trigger hold rule:</b> require the score to stay high for 3 s before generating.",
        "<b>Process:</b> PRs into main should be reviewed and merged by the Team Lead.",
    ],
    viva=[
        ("Concepts", [
            ("Explain how your backend is organised.",
             "server/index.js creates the Express app, loads env with dotenv, adds JSON parsing and the request logger, mounts the routes under /api and adds the error handler last. Routes handle HTTP concerns, telemetryService.js holds the business logic (validation and scoring), and middleware holds cross-cutting concerns."),
            ("Why is the error handler registered after all routes?",
             "Express runs middleware in order. An error handler (a function with four arguments: err, req, res, next) only catches errors from what came before it. Placed last, it catches errors from every route. Express 5 also forwards rejected promises from async handlers to it automatically."),
            ("REST or WebSocket for telemetry: what are the trade-offs?",
             "REST is simple and stateless but pays the cost of a new request every 0.8 s, and the server can't push. A WebSocket keeps one connection, has lower overhead and lets the server push the generated UI. Keeping HTTP as a fallback adds reliability."),
        ]),
        ("Your implementation", [
            ("How is the score calculated today, and what is its weakness?",
             "Fixed steps: +30 for mouse speed over 100, +40 for a pause over 4 s, +30 for 3 or more rage clicks. The score jumps between a few values (0, 30, 40, 70, 100), so it can't show a gradual rise and is sensitive to the exact thresholds."),
            ("How would you improve the scoring?",
             "Normalise each signal to 0–1 (e.g. min(rageClicks/5, 1)), take the weighted sum from the contract (0.35 rage, 0.25 hesitation, 0.25 errors, 0.15 velocity variance), scale it to 0–100, and smooth it over a short window so one spike doesn't trigger generation."),
            ("What does your validation check, and why return 400?",
             "That the body exists and that mouseSpeed, pauseTime and rageClicks are numbers and fieldName is a string. 400 Bad Request tells the client the problem is in its request, not on the server, and the message says exactly which field is wrong."),
            ("How does the request logger measure response time?",
             "It records the start time when the request arrives and logs when the response finishes, so the time includes the route's work. That data helps find slow endpoints, which matters for the 2-second target."),
            ("Why use dotenv, and why is .env never committed?",
             "Configuration such as ports, thresholds and API keys changes between machines and must stay secret. .env holds the real values locally and is git-ignored. .env.example documents the variables without secrets."),
        ]),
        ("What you will build next", [
            ("How would you implement “high for 3 seconds, then a 30-second cool-down”?",
             "Keep per-session, per-field state: firstHighAt and lastGeneratedAt. When the score is at least 70, set firstHighAt if it is empty. If now − firstHighAt is at least 3000 ms and now − lastGeneratedAt is at least 30000 ms, trigger and set lastGeneratedAt. Reset firstHighAt whenever the score drops below 70."),
            ("How will the backend connect to the AI layer?",
             "When the trigger fires, build a generation request (sessionId, frictionPoint, formSchema, formState) and call POST /api/generate, or call the agent directly in-process. Then send the returned ui message (ui.generated or ui.fallback) to that session's WebSocket."),
            ("How would you add the WebSocket server?",
             "Use the ws package on the same HTTP server, accept connections on /ws/telemetry, keep a map from sessionId to socket, parse each telemetry message, reuse the same validation and scoring, reply with the score, and push UI messages to the right socket. Handle close and error events to clean up."),
        ]),
        ("Quality and security", [
            ("What security measures does an API like this need?",
             "Input validation (done), a JSON body size limit, rate limiting per client, a CORS allow-list, no secrets or personal data in logs, and generic error messages to clients with details only in server logs."),
            ("How would you test the backend?",
             "Unit-test the scoring and validation functions with normal, boundary (exactly 70, exactly 4 s) and invalid inputs. Integration-test the routes with supertest or curl: 200 for valid data, 400 for wrong types, 404 for unknown routes, 500 handled by the error handler."),
            ("The frontend and backend both calculate the score. Why is that a problem?",
             "Two formulas can disagree, so the HUD might show 85 while the server decides 70, and bugs get fixed in one place but not the other. There should be one source of truth (the backend), and the frontend should only display what the server returns."),
        ]),
    ],
)

# ------------------------------------------------------------------ Member-04
MEMBERS["Member-04"] = dict(
    file="Member-04_Report.pdf",
    role="Testing, evaluation, documentation, final report and presentation",
    one_line="Owns quality and evidence: test plans and cases, bug tracking, performance measurement, and the final report and slides.",
    responsibilities=[
        "Write the test plan and test cases (normal, edge, invalid, failure).",
        "Test the real modules: telemetry, scoring API, AST validator, generation pipeline, fallback.",
        "Track bugs found during testing and verify fixes.",
        "Measure performance (latency, generation pass rate) and usability for the reviews.",
        "Write documentation, the final report and the presentation.",
    ],
    deliverables=[
        ("Test plan", "W1", "mostly", "Clear structure; describes features that don't exist yet"),
        ("Test cases: normal / edge / invalid / failure", "W1", "mostly", "CSV and Excel sheets; need mapping to real modules"),
        ("Tests executed against the real code", "W2", "todo", "Current Python tests check their own mock classes"),
        ("Bug tracking from real test runs", "W2", "todo", "The tracker lists 8 bugs in parts not yet built"),
        ("Performance evaluation with measured data", "W3", "todo", "Current numbers are simulated with random.gauss"),
        ("Screenshots of the real application", "W3", "todo", "Current images are generated mock-ups"),
        ("Documentation / execution guide", "W2", "partial", "README guide on the branch"),
        ("Final report and presentation", "W4", "started", "Draft exists, but written ahead of the system"),
    ],
    built=[
        ("Test plan", "Master plan with 5 quality invariants: zero data loss, no flicker, WCAG AA, latency budget, stability.", "Test_Plan/"),
        ("Test cases", "Normal, edge, invalid and failure cases as CSV and Excel, plus a bug register.", "Test_Cases/"),
        ("Python test scripts", "API/schema, failure/fallback and responsive/accessibility tests. They test classes defined inside the scripts, not the project code.", "API_Schema_Testing/, Failure_Fallback_Testing/, UI_Responsive_Testing/"),
        ("Bug tracker and repro scripts", "8 bugs, all marked resolved and verified.", "Bug_Reports/"),
        ("Performance evaluation", "A script that generates 1,000 simulated sessions with random numbers.", "Performance_Evaluation/"),
        ("Visual mock-ups", "5 SVG images drawn by a script.", "Screenshots/"),
        ("Final report and deck", "Draft report, HTML slide deck and speaker notes.", "Final_Report/"),
    ],
    flow=[
        "<i>Intended:</i> requirement → test case → test run against the real module → bug report → fix → re-test → evidence in the report.",
        "<i>Current:</i> test cases exist, but the runs exercise stand-alone mock code, so they don't yet produce evidence about AuraGen itself.",
    ],
    timeline=[
        ("14 Nov", "12 file uploads through the GitHub website (test plan, cases, scripts, bug reports, benchmarks, mock-ups, final report), then README updates"),
    ],
    commit_days="1 day (14 Nov)",
    gaps=[
        "<b>Most important:</b> the benchmark numbers (e.g. “62% load reduction over 1,000 sessions”) are generated with random.gauss. Presenting them as measured results at a review would be misleading. Label them as targets, or remove them until real data exists.",
        "The bug tracker marks bugs “resolved and verified” in parts that don't exist yet (LLM streaming, responsive layout adapter, DOM patching). Keep only bugs found by real runs.",
        "Point the tests at the real code: server/ endpoints and ai/validator. The AI layer already has 44 tests to learn from and extend.",
        "Move the work into /tests, remove the duplicate generate_test_plan.py.py, and open a PR.",
        "Commit small pieces daily from git instead of one-day bulk web uploads. Only 1 commit day so far.",
    ],
    viva=[
        ("Concepts", [
            ("What is your testing strategy, and why these four categories?",
             "Normal cases prove the main path works, edge cases probe limits (exactly 70, empty form, very long input), invalid cases check that bad input is rejected cleanly, and failure cases check behaviour when a dependency breaks (LLM timeout, socket drop). Together they cover correctness, robustness and resilience."),
            ("What is the difference between unit, integration and end-to-end tests? Give an AuraGen example of each.",
             "Unit: one function in isolation, e.g. calculateScore(120, 5, 4). Integration: several parts together, e.g. POST /api/generate returns a validated, compiled component. End-to-end: the whole system through the browser, e.g. a scripted user rage-clicks the PAN field and the wizard appears with the typed data kept."),
            ("What is traceability, and why does it matter?",
             "Linking each requirement to the test cases that verify it and the results. It shows reviewers that every requirement (e.g. “block malicious code”) is tested, and shows which requirements have no tests yet."),
        ]),
        ("Testing AuraGen's real modules", [
            ("How would you test the AST safety validator?",
             "Feed it a set of malicious samples (imports, window, fetch, eval, constructor chains, script tags, dangerouslySetInnerHTML, loops) and check that each is rejected with the expected rule. Feed it valid wizards and check that they pass. The 44 tests in ai/test are a starting point."),
            ("How would you test the fallback behaviour?",
             "Make the LLM fail on purpose: a model that hangs (expect status error and timeout), returns no code, or returns unsafe code twice (expect rejected). Check the API returns ui.fallback and the browser shows the static wizard without losing data."),
            ("How would you check that typed data survives the UI swap?",
             "In an end-to-end test (e.g. Playwright), type values into several fields, trigger generation, then assert the generated wizard shows the same values, and that submitting sends them all."),
            ("How would you validate that the Cognitive Load Score is accurate?",
             "Record scripted sessions labelled “calm” and “confused”. Measure how often the trigger fires on confused sessions (recall) and how rarely on calm ones (false-positive rate). Tune thresholds and weights from those results."),
        ]),
        ("Measurement and honesty of results", [
            ("Your benchmarks come from random.gauss. How would you get real numbers?",
             "Measure them. Latency: timestamps around /api/generate and the browser render (the AI audit already reports mean and p95). Valid-generation rate: the audit script run with the real model. Usability: a small study timing participants on the static form and the healed form. Label anything not measured as a target."),
            ("Why is it a problem to report simulated results as findings?",
             "It misrepresents what the system does, examiners can easily spot it from the code, and it hides real bugs. Honest, smaller measured numbers are worth more than impressive invented ones."),
            ("How do you measure the under-2-second redesign target?",
             "Start a timer when the trigger fires and stop it when the generated component has rendered. Report median and p95 over many runs, separately for cache hits and misses."),
        ]),
        ("Quality standards and process", [
            ("What does WCAG 2.2 AA require for text contrast, and how would you test it?",
             "At least 4.5:1 for normal text and 3:1 for large text. Use an automated checker (axe or Lighthouse) on both the static and generated UIs, plus keyboard-only navigation checks."),
            ("What is CLS, and why does it matter during a UI morph?",
             "Cumulative Layout Shift measures how much visible content jumps around while the page is in use. A good score is 0.1 or less. A morph that jumps can disorient a user who is already confused, so animation should reserve space and transition smoothly."),
            ("How should a good bug report be written?",
             "A clear title, steps to reproduce, expected vs actual result, environment, severity, evidence (log or screenshot), and a status that changes only after a re-test."),
            ("Why commit small changes through git instead of bulk web uploads?",
             "Small commits make history readable, reviews possible and mistakes easy to revert. The internship also requires regular commits on many separate days."),
        ]),
    ],
)

# ======================================================================== BUILDERS


def member_story(name, m):
    pct = score(m["deliverables"])
    story = [banner(f"AuraGen · {name} Progress Report", f"{m['role']}<br/>Branch {name} · status as of {AS_OF}"), Spacer(1, 8)]
    story.append(meter(pct, "Estimated completion of this role's full-month deliverables (see method below)"))
    story.append(Spacer(1, 4))
    story.append(P(f"<b>In one line:</b> {m['one_line']}"))
    story.append(P(f"<b>Days with commits so far:</b> {m['commit_days']}"))

    story.append(P("1. Role and responsibilities", "h1"))
    story += bullets(m["responsibilities"])

    story.append(P("2. Completion breakdown", "h1"))
    story.append(deliverable_table(m["deliverables"]))
    story.append(Spacer(1, 4))
    story.append(P(RUBRIC, "small"))

    story.append(P("3. What has been built (in plain words)", "h1"))
    story.append(table([["Piece", "What it does", "Where"]] + [[a, b, code(c)] for a, b, c in m["built"]], [36 * mm, 100 * mm, 44 * mm]))

    story.append(P("4. How it works", "h1"))
    story += bullets(m["flow"])

    story.append(P("5. Timeline", "h1"))
    story.append(table([["Date", "Work"]] + [[d, w] for d, w in m["timeline"]], [22 * mm, 158 * mm]))

    story.append(P("6. Gaps, risks and next steps", "h1"))
    story += bullets(m["gaps"])

    story.append(PageBreak())
    story.append(P("7. Viva questions with model answers", "h1"))
    story += viva(m["viva"])
    return story, pct


def overview_story(scores):
    story = [banner("AuraGen · Team Progress Overview", f"Self-Healing Generative UI via Cognitive Load · Infotact GenAI Internship, Project 1<br/>Status as of {AS_OF} (Week 2, day 4)"), Spacer(1, 8)]
    team_pct = round(sum(scores.values()) / len(scores))
    story.append(meter(team_pct, "Average estimated completion across the four roles (full-month scope)"))

    story.append(P("1. The project in one paragraph", "h1"))
    story.append(P("Standard forms are static: when users get confused they must read tooltips or give up. AuraGen measures how a user "
                   "interacts with a complex financial form (cursor speed, hesitation, rage clicks) and turns it into a Cognitive Load Score. "
                   "When the score is high, an LLM writes a simplified step-by-step React wizard for the exact field the user is stuck on. "
                   "The code is checked for safety with a Babel AST validator, compiled, and swapped into the page live without losing what "
                   "the user typed."))

    story.append(P("2. Who does what and how far along they are", "h1"))
    rows = [["Member", "Role", "Completed so far", "Score", "Commit days"]]
    summaries = {
        "Member-01": "Contracts; prompt builder; LangChain Code-Gen Agent with repair loop; Babel validator and compiler; mock LLM; cache; /api/generate; audit tool; records (44 tests)",
        "Member-02": "Next.js app; complex form; telemetry hook (WebSocket + HTTP fallback); HUD; basic UI kit",
        "Member-03": "Express server; telemetry endpoint; scoring; validation; error handler; request logger",
        "Member-04": "Test plan and test cases; bug tracker, benchmarks and report drafts (simulated, need rework)",
    }
    extra = []
    for i, (name, m) in enumerate(MEMBERS.items(), start=1):
        pct = scores[name]
        fg, bg = (GREEN, GREEN_SOFT) if pct >= 70 else (AMBER, AMBER_SOFT) if pct >= 40 else (RED, RED_SOFT)
        rows.append([f"<b>{name}</b>", m["role"].split(" · ")[0], summaries[name], f'<font color="{fg.hexval()}"><b>{pct}%</b></font>', m["commit_days"].split(" (")[0]])
        extra.append(("BACKGROUND", (3, i), (3, i), bg))
    story.append(table(rows, [20 * mm, 30 * mm, 88 * mm, 16 * mm, 26 * mm], extra=extra))
    story.append(Spacer(1, 3))
    story.append(P(RUBRIC, "small"))

    story.append(P("3. Progress against the official plan", "h1"))
    story.append(table([
        ["Week", "AI and Backend plan", "Frontend plan", "Reality"],
        ["W1 (5–11 Nov)", "LangChain pipeline fed with the component library", "Telemetry hook streaming over WebSockets", "Both done (AI side finished late, on 15 Nov)"],
        ["W2 (12–18 Nov)", "Babel layer that blocks bad or malicious code", "Shell that compiles a code string and renders it", "Babel layer done. Rendering shell not started"],
        ["W3 (19–25 Nov)", "Generation audit; contextual awareness", "Score spikes during simulated confusion", "Audit tool done (mock). Privacy-safe prompt done. Spike evidence pending"],
        ["W4 (26 Nov–4 Dec)", "Caching and streaming, under 2 s", "Framer Motion morph; fallback states", "Cache done. Others not started"],
    ], [26 * mm, 50 * mm, 50 * mm, 54 * mm]))

    story.append(P("4. End-to-end flow: what works and what is missing", "h1"))
    story.append(table([
        ["Step", "Owner", "Status"],
        ["User struggles → telemetry hook measures it", "Member-02", '<font color="#2e7d32"><b>Works</b></font>'],
        ["Backend scores it, triggerAI at 70", "Member-03", '<font color="#2e7d32"><b>Works</b></font>'],
        ["Backend calls the AI layer when triggered", "Member-03 + Member-01", '<font color="#c62828"><b>Missing link</b></font>'],
        ["AI writes, validates and compiles the wizard (/api/generate)", "Member-01", '<font color="#2e7d32"><b>Works</b></font> (mock LLM until the key is approved)'],
        ["Browser renders the generated wizard and keeps typed data", "Member-02", '<font color="#c62828"><b>Missing link</b></font>'],
        ["Smooth morph animation and fallback states", "Member-02", '<font color="#b26a00"><b>Week 4</b></font>'],
        ["Real tests and measured evidence", "Member-04", '<font color="#c62828"><b>Needs rework</b></font>'],
    ], [84 * mm, 40 * mm, 56 * mm]))

    story.append(P("5. Top issues before the mid review (20–27 Nov)", "h1"))
    story += bullets([
        "<b>Close the two missing links</b> (backend → /api/generate, and the browser renderer) to get a live demo.",
        "<b>Commit-day rule:</b> commits on 10 of the previous 14 days. Every member should commit something small every day.",
        "<b>One scoring formula:</b> the frontend and backend calculate the score differently.",
        "<b>Contract drift:</b> the running REST payload differs from docs/contracts.md. Agree on it and update the contract.",
        "<b>Evidence must be real:</b> replace simulated benchmark numbers with measured ones, or label them as targets.",
        "<b>Process:</b> only the Team Lead merges into main, after review. The Work Distribution Document is due before the mid review.",
    ])

    story.append(PageBreak())
    story.append(P("6. Team-level viva questions with model answers", "h1"))
    story += viva([
        ("Project and architecture", [
            ("Describe AuraGen's architecture.",
             "Four modules. The Friction Engine (React hook plus backend scoring) measures user struggle. The Code-Gen Agent (LangChain plus LLM) writes a component. The AST Injector (Babel) validates and compiles it. The Dynamic Renderer (Next.js) swaps it into the page. They talk through versioned contracts: telemetry, score, generation request and result, and UI push messages."),
            ("What is a Cognitive Load Score, and how is it computed?",
             "A 0–100 estimate of how much a user is struggling, combined from behaviour signals: rage clicks, hesitation, validation errors and cursor velocity variance. Generation triggers when the score stays at 70 or above."),
            ("Why is AI-generated code dangerous, and how does AuraGen stay safe?",
             "It runs in the user's browser, so a bad line could steal data or call APIs. AuraGen parses it into an AST and enforces an allow-list (approved components, two hooks, a few HTML tags, no imports or globals). It compiles only code that passes, runs it with dangerous globals shadowed, and falls back to a static wizard on any failure."),
        ]),
        ("Data, privacy and ethics", [
            ("What user data does AuraGen collect, and how is privacy protected?",
             "Interaction signals (speed, pauses, clicks) and field identifiers. Typed values should never leave the browser for analytics, and they never go into the LLM prompt: the AI only learns whether a field is filled. API keys stay on the server."),
            ("Is it ethical to change a UI based on a user's emotional state?",
             "It can be, if it helps the user and is transparent: tell users the form can adapt, let them switch back to the original form, never use it to push decisions (e.g. financial products), and don't store behavioural profiles longer than needed."),
        ]),
        ("Reliability and performance", [
            ("What happens if the LLM is slow, down or returns broken code?",
             "Each call has a timeout. Broken code gets one repair attempt. After that the result is “rejected” or “error”, the backend sends ui.fallback, and the browser shows a pre-built static wizard. The user is never left with a blank or broken screen."),
            ("How does the team plan to redesign the UI in under 2 seconds?",
             "Cache repeated friction points (about 1 ms per hit), keep prompts short, stream tokens, and pre-generate wizards for the hardest fields."),
        ]),
        ("Teamwork", [
            ("How is the work divided, and how do the parts come together?",
             "One branch and folder per role: AI (Member-01), frontend (Member-02), backend (Member-03), testing and docs (Member-04). Interfaces are fixed in docs/contracts.md. The Team Lead reviews PRs into main and tracks progress in the records folder and these reports."),
            ("What would you do differently if you started again?",
             "Agree the contracts and one scoring formula on day one, build a thin end-to-end slice in Week 1 using a mock LLM, write tests against real modules from the start, and commit small pieces daily."),
        ]),
    ])
    return story


def main():
    scores = {}
    paths = []
    for name, m in MEMBERS.items():
        story, pct = member_story(name, m)
        scores[name] = pct
        paths.append(build(m["file"], f"{name} report", story))
    paths.insert(0, build("00_Team_Overview.pdf", "Team overview", overview_story(scores)))
    for p in paths:
        print("wrote", os.path.relpath(p))
    print("scores", scores)


if __name__ == "__main__":
    main()
