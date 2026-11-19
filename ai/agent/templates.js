"use strict";

/**
 * Deterministic wizard generator.
 *
 * Produces a valid, design-system-compliant component for any form field without calling an LLM.
 * Used by:
 *   - the mock chat model (demos and tests with no API key)
 *   - the audit script, as a known-good baseline
 * Every string from the schema is embedded with JSON.stringify, so schema text can never break out
 * of a string literal into code.
 */

const lit = (s) => JSON.stringify(String(s === undefined || s === null ? "" : s));

function componentNameFor(label) {
  const words = String(label || "Field").replace(/[^A-Za-z0-9 ]+/g, " ").trim().split(/\s+/).filter(Boolean);
  let name = words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join("") || "Field";
  if (!/^[A-Z]/.test(name)) name = `Field${name}`;
  return `${name.slice(0, 40)}Wizard`;
}

function inputFor(field) {
  const id = lit(field.id);
  const label = lit(field.label);
  const value = `values[${id}]`;
  const change = `(v) => onChange(${id}, v)`;
  switch ((field.type || "text").toLowerCase()) {
    case "number": {
      const range = [field.min !== undefined ? `min={${Number(field.min)}}` : "", field.max !== undefined ? `max={${Number(field.max)}}` : ""].filter(Boolean).join(" ");
      return `<NumberField id={${id}} label={${label}} value={${value}} onChange={${change}} ${range} />`;
    }
    case "select": {
      const options = Array.isArray(field.options) ? field.options.map((o) => (typeof o === "object" && o !== null ? o : { value: String(o), label: String(o) })) : [];
      return `<SelectField id={${id}} label={${label}} value={${value}} onChange={${change}} options={${JSON.stringify(options)}} />`;
    }
    case "date":
      return `<DateField id={${id}} label={${label}} value={${value}} onChange={${change}} />`;
    case "checkbox":
      return `<Checkbox id={${id}} label={${label}} checked={!!${value}} onChange={${change}} />`;
    default:
      return `<TextField id={${id}} label={${label}} value={${value} || ""} onChange={${change}}${field.placeholder ? ` placeholder={${lit(field.placeholder)}}` : ""} />`;
  }
}

/** Returns JSX source for a two-step wizard that helps with one field. */
function wizardFor(field) {
  if (!field || !field.id) throw new TypeError("wizardFor needs a field with an id.");
  const name = componentNameFor(field.label || field.id);
  const explain = [
    field.help ? `What it is: ${field.help}` : `This step is about "${field.label || field.id}".`,
    field.pattern ? `Required format: ${field.pattern}` : field.required ? "This field is required." : "You can leave this empty if it does not apply.",
  ];

  return `const STEPS = ${JSON.stringify([
    { title: `About ${field.label || field.id}`, description: "Let's take this one step at a time." },
    { title: `Enter ${field.label || field.id}`, description: "Fill it in below. You can go back at any time." },
  ])};

export default function ${name}({ values, onChange, onSubmit }) {
  const [step, setStep] = useState(0);
  return (
    <Wizard onSubmit={onSubmit}>
      <ProgressBar current={step + 1} total={STEPS.length} />
      <WizardStep title={STEPS[step].title} description={STEPS[step].description}>
        {step === 0 ? (
          <Card className="p-4 bg-slate-50 rounded-lg">
            <Stack className="gap-2">
              <HelpText>{${lit(explain[0])}}</HelpText>
              <HelpText>{${lit(explain[1])}}</HelpText>
            </Stack>
          </Card>
        ) : (
          <Stack className="gap-3">
            ${inputFor(field)}
          </Stack>
        )}
        <div className="flex justify-between mt-4">
          <Button variant="secondary" onClick={() => setStep(step > 0 ? step - 1 : 0)}>Back</Button>
          <Button variant="primary" onClick={() => (step === 0 ? setStep(1) : onSubmit())}>{step === 0 ? "Next" : "Done"}</Button>
        </div>
      </WizardStep>
    </Wizard>
  );
}
`;
}

module.exports = { wizardFor, componentNameFor };
