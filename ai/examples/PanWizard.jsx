// Reference output: what a valid generated component looks like.
// Used by the validator tests now and as a few-shot example in the LLM prompt later.

const STEPS = [
  { title: "Find your PAN", description: "It is printed on your PAN card, under your name." },
  { title: "Type it in", description: "5 letters, 4 digits, then 1 letter. Example: ABCDE1234F" },
];

export default function PanWizard({ values, onChange, onSubmit }) {
  const [step, setStep] = useState(0);
  const pan = values["field-pan"] || "";
  const looksValid = useMemo(() => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan), [pan]);

  return (
    <Wizard onSubmit={onSubmit}>
      <ProgressBar current={step + 1} total={STEPS.length} />
      <WizardStep title={STEPS[step].title} description={STEPS[step].description}>
        {step === 0 ? (
          <Card className="p-4 bg-slate-50 rounded-lg">
            <HelpText>Look for the 10-character code on the front of the card.</HelpText>
          </Card>
        ) : (
          <Stack className="gap-3">
            <TextField
              id="field-pan"
              label="PAN Number"
              value={pan}
              onChange={(v) => onChange("field-pan", v.toUpperCase())}
              placeholder="ABCDE1234F"
              error={pan && !looksValid ? "That doesn't match the PAN format yet." : undefined}
            />
          </Stack>
        )}
        <div className="flex justify-between mt-4">
          <Button variant="secondary" onClick={() => setStep(step > 0 ? step - 1 : 0)}>Back</Button>
          <Button variant="primary" onClick={() => (step === 0 ? setStep(1) : onSubmit())}>
            {step === 0 ? "Next" : "Done"}
          </Button>
        </div>
      </WizardStep>
    </Wizard>
  );
}
