"use strict";

// Sample friction points used by the tests and the generation audit.
// They cover every field type the wizard generator supports.
const FIELDS = [
  { id: "field-name", label: "Full name", type: "text", required: true, group: "identity" },
  { id: "field-pan", label: "PAN Number", type: "text", required: true, pattern: "^[A-Z]{5}[0-9]{4}[A-Z]$", help: "10-character tax ID", group: "identity" },
  { id: "field-dob", label: "Date of birth", type: "date", required: true, group: "identity" },
  { id: "field-income", label: "Annual income", type: "number", min: 0, max: 100000000, help: "Gross yearly income before tax", group: "income" },
  { id: "field-employment", label: "Employment type", type: "select", options: ["Salaried", "Self-employed", "Business owner", "Retired"], group: "income" },
  { id: "field-ifsc", label: "IFSC code", type: "text", pattern: "^[A-Z]{4}0[A-Z0-9]{6}$", help: "11-character bank branch code", group: "bank" },
  { id: "field-consent", label: "I agree to the credit check", type: "checkbox", required: true, group: "consent" },
];

const SIGNALS = [
  { rageClicks: 3, hesitationMs: 4200 },
  { hesitationMs: 6500, errorRate: 0.5 },
  { rageClicks: 5, cursorVelocityVariance: 0.8 },
];

function scenarios() {
  return FIELDS.map((f, i) => ({
    name: `${f.type}: ${f.label}`,
    request: {
      sessionId: `s_audit_${i}`,
      frictionPoint: { fieldId: f.id, label: f.label, signals: SIGNALS[i % SIGNALS.length] },
      formSchema: { formId: "financial-form-v1", fields: FIELDS },
      formState: { values: { "field-name": "<typed name>" }, errors: {} },
      designSystemVersion: "ds-0.1",
    },
  }));
}

module.exports = { FIELDS, scenarios };
