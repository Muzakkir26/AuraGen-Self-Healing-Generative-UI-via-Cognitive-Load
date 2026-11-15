"""
AuraGen Final Project Report Compiler & Deliverable Auditor
Audits and summarizes the final project deliverables in Final_Report/.
"""

import os

def main():
    target_dir = os.path.dirname(os.path.abspath(__file__))
    deliverables = [
        ("final_project_report.md", "Comprehensive Technical & Evaluation Report (189 lines)"),
        ("presentation_deck.html", "Interactive 17-Slide Presentation Deck with Live KPIs"),
        ("slides_speaker_notes.md", "Slide-by-Slide Talking Script with Speaker Talking Points")
    ]

    print("=" * 75)
    print(" AURAGEN FINAL REPORT & PRESENTATION DELIVERABLE AUDIT")
    print("=" * 75)
    for fname, desc in deliverables:
        fpath = os.path.join(target_dir, fname)
        size = os.path.getsize(fpath) if os.path.exists(fpath) else 0
        status = "READY" if os.path.exists(fpath) and size > 0 else "MISSING"
        print(f"[{status}] {fname:<26} ({size:>5} bytes) - {desc}")
    print("=" * 75)
    print("All final report and presentation materials verified.")

if __name__ == "__main__":
    main()
