// Server-side schema of the financial form (src/components/portal/ComplexFinancialForm.tsx).
//
// The browser only sends the stuck field's name, so the backend needs this schema to build a
// full generation request (contracts §3). Keep the ids in sync with the form's `name` attributes.

var FINANCIAL_FORM = {
  formId: "financial-form-v1",
  fields: [
    { id: "business_legal_name", label: "Legal Business Name", type: "text", required: true, group: "entity", help: "The exact registered name, including LLC / Inc." },
    { id: "jurisdiction", label: "Incorporation Jurisdiction", type: "text", required: true, group: "entity", help: "State or country where the business is registered, e.g. Delaware, USA" },
    { id: "annual_income", label: "Gross Annual Operating Income ($)", type: "number", required: true, group: "financials", help: "Total yearly income before expenses, in whole dollars" },
    { id: "tax_id", label: "Federal Tax ID / EIN", type: "text", required: true, group: "financials", pattern: "^[0-9]{2}-[0-9]{7}$", help: "9 digits written as XX-XXXXXXX" },
    { id: "monthly_debt", label: "Monthly Debt Service ($)", type: "number", required: true, group: "financials", help: "Total loan repayments due each month" },
    { id: "collateral_valuation", label: "Appraised Collateral ($)", type: "number", required: true, group: "financials", help: "Value of assets pledged against the loan" },
    { id: "covenant_compliance", label: "I confirm compliance with all loan covenants", type: "checkbox", required: true, group: "legal" },
  ],
};

function findField(fieldId) {
  return FINANCIAL_FORM.fields.find(function (f) { return f.id === fieldId; }) || null;
}

/**
 * Turns the telemetry payload the frontend sends (mouseSpeed, pauseTime, rageClicks, fieldName,
 * userInput) into a generation request (contracts §3). Returns null for an unknown field.
 * The typed value goes into formState.values so the generated wizard can keep it; the prompt
 * builder only ever tells the LLM whether a field is filled or empty.
 */
function toGenerationRequest(telemetry, sessionId) {
  var field = findField(telemetry.fieldName);
  if (!field) return null;
  var values = {};
  if (typeof telemetry.userInput === "string" && telemetry.userInput !== "") values[field.id] = telemetry.userInput;
  return {
    sessionId: sessionId,
    frictionPoint: {
      fieldId: field.id,
      label: field.label,
      signals: { rageClicks: telemetry.rageClicks, hesitationMs: Math.round(telemetry.pauseTime * 1000) },
    },
    formSchema: FINANCIAL_FORM,
    formState: { values: values, errors: {} },
    designSystemVersion: "ds-0.1",
  };
}

module.exports = { FINANCIAL_FORM, findField, toGenerationRequest };
