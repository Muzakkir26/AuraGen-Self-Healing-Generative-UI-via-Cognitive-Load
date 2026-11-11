'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Building2,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
  RefreshCw,
  Flame,
} from 'lucide-react';

interface ComplexFinancialFormProps {
  onFieldFocus: (fieldName: string, value: string) => void;
  onFieldChange: (fieldName: string, value: string) => void;
  onFieldBlur: () => void;
  isTriggered: boolean;
  stuckField: string;
  savedValue: string;
  cognitiveScore: number;
  onReset: () => void;
  isDebug?: boolean;
}

export function ComplexFinancialForm({
  onFieldFocus,
  onFieldChange,
  onFieldBlur,
  isTriggered,
  stuckField,
  savedValue,
  cognitiveScore,
  onReset,
  isDebug = false,
}: ComplexFinancialFormProps) {
  // Empty initial values with placeholders as requested (no hardcoded prefilled values)
  const [formData, setFormData] = useState({
    business_legal_name: '',
    jurisdiction: '',
    annual_income: '',
    tax_id: '',
    monthly_debt: '',
    collateral_valuation: '',
    covenant_compliance: false, // Unchecked by default
  });

  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    onFieldChange(field, value);
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, covenant_compliance: checked }));
    onFieldChange('covenant_compliance', checked ? 'true' : 'false');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.covenant_compliance) {
      alert('Please certify the compliance covenant checkbox before submitting.');
      return;
    }
    setIsSubmitted(true);
  };

  const isFieldStuck = (name: string) => isTriggered && stuckField === name;

  return (
    <div className="space-y-6">
      {/* AuraGen welcome panel */}
      <section className="aura-hero rounded-[24px] p-6 md:p-9 text-white">
        <div className="aura-hero-grid relative z-10">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-violet-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.8)]" />
              Adaptive commercial finance portal
            </span>
            <div className="space-y-2">
              <h2 className="text-2xl md:text-[32px] leading-tight font-bold tracking-tight">
                Financing, made <span className="text-cyan-200">simpler.</span>
              </h2>
              <p className="max-w-xl text-sm md:text-[15px] leading-7 text-indigo-100/90">
                Share your business details in a guided application designed to respond to your pace and keep your progress in view.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold text-white/90">Form CF-889</span>
              <span className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold text-white/90">3 guided sections</span>
              <span className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold text-white/90">Secure workflow</span>
            </div>
          </div>
          <div className="aura-hero-stat hidden sm:block">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-200">
              <Lock className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[.15em] text-indigo-200">Your information</p>
            <p className="mt-1 text-sm font-semibold text-white">Protected at every step</p>
            <p className="mt-1 text-[11px] leading-5 text-indigo-100/75">Complete each section at your own pace.</p>
          </div>
        </div>
      </section>

      {/* Real-time Friction Alert Banner when Cognitive Friction is Detected */}
      {isTriggered && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-300 bg-rose-50/90 p-5 shadow-sm space-y-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-600 flex-shrink-0 mt-0.5">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-rose-950">
                    High Cognitive Friction Detected on Field: <code>{stuckField || 'annual_income'}</code>
                  </h3>
                  <Badge variant="danger" size="sm">
                    Score: {cognitiveScore}/100
                  </Badge>
                </div>
                <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                  Hesitation or rapid click patterns detected on this section. Preserved field input:{' '}
                  <strong>${savedValue || formData.annual_income || '0'}</strong>.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="text-xs border-rose-300 bg-white hover:bg-rose-50 text-rose-800"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Reset Status
            </Button>
          </div>
        </div>
      )}

      {isSubmitted ? (
        <Card className="border-emerald-200 bg-emerald-50/50 p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">Application Submitted</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Your commercial credit application has been logged for underwriting review.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsSubmitted(false);
              onReset();
            }}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Start New Application
          </Button>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Entity Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Commercial Entity Profile</h3>
              </div>
              <span className="aura-step-label">Step 01 / 03</span>
            </CardHeader>
            <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Input
                  id="business_legal_name"
                  name="business_legal_name"
                  label="Legal Business Name"
                  value={formData.business_legal_name}
                  onChange={(e) => handleInputChange('business_legal_name', e.target.value)}
                  onFocus={() => onFieldFocus('business_legal_name', formData.business_legal_name)}
                  onBlur={onFieldBlur}
                  placeholder="Apex Horizon Technologies LLC"
                  isStuck={isFieldStuck('business_legal_name')}
                  required
                />
                {isFieldStuck('business_legal_name') && (
                  <div className="absolute right-3 top-8 flex items-center gap-1 text-rose-600 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Friction Target</span>
                  </div>
                )}
              </div>

              <div className="relative">
                <Input
                  id="jurisdiction"
                  name="jurisdiction"
                  label="Incorporation Jurisdiction"
                  value={formData.jurisdiction}
                  onChange={(e) => handleInputChange('jurisdiction', e.target.value)}
                  onFocus={() => onFieldFocus('jurisdiction', formData.jurisdiction)}
                  onBlur={onFieldBlur}
                  placeholder="Delaware, USA"
                  isStuck={isFieldStuck('jurisdiction')}
                  required
                />
                {isFieldStuck('jurisdiction') && (
                  <div className="absolute right-3 top-8 flex items-center gap-1 text-rose-600 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Friction Target</span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Section 2: Underwriting Financials */}
          <Card className={isTriggered && stuckField in formData ? 'ring-2 ring-rose-400 border-rose-300' : ''}>
            <CardHeader className="bg-slate-50/70">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    2. Underwriting & Income Assessment
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {isDebug && (
                    <Badge variant={isTriggered ? 'danger' : 'info'} size="sm" dot>
                      {isTriggered ? 'Friction Detected' : 'Actively Monitored'}
                    </Badge>
                  )}
                  <span className="aura-step-label">Step 02 / 03</span>
                </div>
              </div>
            </CardHeader>

            <CardBody className="space-y-6">
              {isDebug && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Field-Level Hesitation Active:</strong> Focusing an input begins measuring
                    pause time strictly for that specific field. Leaving the field or typing resets pause time.
                    Telemetry streams continuously every 0.5–1s.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Monitored Field: annual_income */}
                <div className="relative">
                  <Input
                    id="annual_income"
                    name="annual_income"
                    label="Gross Annual Operating Income ($)"
                    tooltip="Consolidated gross pre-tax income from all qualifying operations"
                    value={formData.annual_income}
                    onChange={(e) => handleInputChange('annual_income', e.target.value)}
                    onFocus={() => onFieldFocus('annual_income', formData.annual_income)}
                    onBlur={onFieldBlur}
                    placeholder="e.g. 50000"
                    leftAddon={<span className="text-sm font-bold text-slate-500">$</span>}
                    helperText={
                      isFieldStuck('annual_income')
                        ? 'Cognitive friction spike detected on this field'
                        : undefined
                    }
                    isStuck={isFieldStuck('annual_income')}
                    required
                  />
                  {isFieldStuck('annual_income') && (
                    <div className="absolute right-3 top-8 flex items-center gap-1 text-rose-600 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4" />
                      <span>Friction Target</span>
                    </div>
                  )}
                </div>

                {/* Tax ID */}
                <div className="relative">
                  <Input
                    id="tax_id"
                    name="tax_id"
                    label="Federal Tax ID / EIN"
                    value={formData.tax_id}
                    onChange={(e) => handleInputChange('tax_id', e.target.value)}
                    onFocus={() => onFieldFocus('tax_id', formData.tax_id)}
                    onBlur={onFieldBlur}
                    placeholder="XX-XXXXXXX"
                    helperText={
                      isFieldStuck('tax_id')
                        ? 'Cognitive friction spike detected on this field'
                        : 'Standard 9-digit IRS identifier'
                    }
                    isStuck={isFieldStuck('tax_id')}
                  />
                  {isFieldStuck('tax_id') && (
                    <div className="absolute right-3 top-8 flex items-center gap-1 text-rose-600 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4" />
                      <span>Friction Target</span>
                    </div>
                  )}
                </div>

                {/* Monthly Debt */}
                <div className="relative">
                  <Input
                    id="monthly_debt"
                    name="monthly_debt"
                    label="Monthly Debt Service ($)"
                    value={formData.monthly_debt}
                    onChange={(e) => handleInputChange('monthly_debt', e.target.value)}
                    onFocus={() => onFieldFocus('monthly_debt', formData.monthly_debt)}
                    onBlur={onFieldBlur}
                    placeholder="e.g. 3800"
                    leftAddon={<span className="text-sm font-bold text-slate-500">$</span>}
                    helperText={
                      isFieldStuck('monthly_debt')
                        ? 'Cognitive friction spike detected on this field'
                        : undefined
                    }
                    isStuck={isFieldStuck('monthly_debt')}
                  />
                  {isFieldStuck('monthly_debt') && (
                    <div className="absolute right-3 top-8 flex items-center gap-1 text-rose-600 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4" />
                      <span>Friction Target</span>
                    </div>
                  )}
                </div>

                {/* Collateral Valuation */}
                <div className="relative">
                  <Input
                    id="collateral_valuation"
                    name="collateral_valuation"
                    label="Appraised Collateral ($)"
                    value={formData.collateral_valuation}
                    onChange={(e) => handleInputChange('collateral_valuation', e.target.value)}
                    onFocus={() => onFieldFocus('collateral_valuation', formData.collateral_valuation)}
                    onBlur={onFieldBlur}
                    placeholder="e.g. 185000"
                    leftAddon={<span className="text-sm font-bold text-slate-500">$</span>}
                    helperText={
                      isFieldStuck('collateral_valuation')
                        ? 'Cognitive friction spike detected on this field'
                        : undefined
                    }
                    isStuck={isFieldStuck('collateral_valuation')}
                  />
                  {isFieldStuck('collateral_valuation') && (
                    <div className="absolute right-3 top-8 flex items-center gap-1 text-rose-600 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4" />
                      <span>Friction Target</span>
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Section 3: Legal Disclosures */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Solvency Covenants & Attestation</h3>
              </div>
              <span className="aura-step-label">Step 03 / 03</span>
            </CardHeader>
            <CardBody className="space-y-4">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors cursor-pointer ${
                  isFieldStuck('covenant_compliance')
                    ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-200'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
                onFocus={() => onFieldFocus('covenant_compliance', formData.covenant_compliance ? 'true' : 'false')}
                onBlur={onFieldBlur}
              >
                <input
                  type="checkbox"
                  id="covenant_compliance"
                  name="covenant_compliance"
                  checked={formData.covenant_compliance}
                  onChange={(e) => handleCheckboxChange(e.target.checked)}
                  onFocus={() => onFieldFocus('covenant_compliance', formData.covenant_compliance ? 'true' : 'false')}
                  onBlur={onFieldBlur}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-xs text-slate-700 leading-relaxed select-none">
                  I certify under penalty of perjury that the submitted financials, income totals, and
                  collateral metrics are accurate and reflect bona fide commercial activity.
                </span>
              </label>
            </CardBody>
            <CardFooter>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Audited via Infotact Secure Financial Gateway</span>
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="shadow-md"
              >
                Submit Application
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
      <div className="aura-footer flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1 text-[10px] font-medium tracking-wide">
        <span>© AuraGen</span><span>•</span><span>Adaptive interface experience</span><span>•</span><span>Secure application workflow</span>
      </div>
    </div>
  );
}
