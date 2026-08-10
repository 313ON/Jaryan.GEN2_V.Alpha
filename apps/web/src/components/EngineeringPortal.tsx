'use client';

import {
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  calculateEngineeringModel,
  DEFAULT_ENGINEERING_INPUTS,
  ENGINEERING_ASSUMPTIONS,
  INPUT_RANGES,
  type EngineeringInputs,
  type FieldError,
  type InputField,
} from '@/domain/engineering';

type Tone = 'neutral' | 'good' | 'caution';

const icons = {
  mark: (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3 28 10v12L16 29 4 22V10L16 3Z" />
      <path d="m10 19 6-11 6 11-6 4-6-4Z" />
    </svg>
  ),
  location: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  structure: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 20h18M5 20C5 10 8 4 12 4s7 6 7 16M7 13h10M9 7.5h6" />
    </svg>
  ),
  solar: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M12 1v2M12 13v2M5 8H3M21 8h-2M7 3 5.5 1.5M18.5 14.5 17 13M17 3l1.5-1.5M5.5 14.5 7 13M5 18h14l2 4H3l2-4Z" />
    </svg>
  ),
  water: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2S5.5 9.5 5.5 15a6.5 6.5 0 0 0 13 0C18.5 9.5 12 2 12 2Z" />
      <path d="M9 16.5c.5 1.3 1.5 2 3 2" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v5M12 17.5v.1" />
    </svg>
  ),
};

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
  }).format(value);
}

function StatusPill({
  children,
  tone = 'neutral',
  pulse = false,
}: {
  children: ReactNode;
  tone?: Tone;
  pulse?: boolean;
}) {
  return (
    <span className={`status-pill status-pill--${tone}`}>
      <span className={pulse ? 'status-dot status-dot--pulse' : 'status-dot'} />
      {children}
    </span>
  );
}

function PanelHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="panel-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function InputGroup({
  icon,
  index,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  index: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="input-group" aria-labelledby={`input-group-${index}`}>
      <header className="input-group__header">
        <span className="input-group__icon">{icon}</span>
        <div>
          <span className="input-group__index">{index}</span>
          <h3 id={`input-group-${index}`}>{title}</h3>
          <p>{description}</p>
        </div>
      </header>
      <div className="input-group__body">{children}</div>
    </section>
  );
}

function NumberControl({
  field,
  label,
  unit,
  hint,
  value,
  step,
  error,
  onChange,
}: {
  field: InputField;
  label: string;
  unit: string;
  hint: string;
  value: number;
  step: number;
  error?: string;
  onChange: (field: InputField, value: number) => void;
}) {
  const id = useId();
  const range = INPUT_RANGES[field];
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={`control ${error ? 'control--error' : ''}`}>
      <div className="control__label-row">
        <label htmlFor={id}>{label}</label>
        <span>{unit}</span>
      </div>
      <div className="control__input-wrap">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={range.min}
          max={range.max}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hintId}
          onChange={(event) =>
            onChange(field, event.currentTarget.valueAsNumber)
          }
        />
        <span aria-hidden="true">{unit}</span>
      </div>
      <div className="control__range" aria-hidden="true">
        <span>{range.min}</span>
        <span className="control__track">
          <span
            style={{
              width: `${
                Number.isFinite(value)
                  ? Math.max(
                      0,
                      Math.min(
                        100,
                        ((value - range.min) / (range.max - range.min)) * 100,
                      ),
                    )
                  : 0
              }%`,
            }}
          />
        </span>
        <span>{range.max}</span>
      </div>
      {error ? (
        <p className="control__message control__message--error" id={errorId}>
          {error}
        </p>
      ) : (
        <p className="control__message" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  unit,
  context,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  unit?: string;
  context: string;
  tone?: Tone;
}) {
  return (
    <article className={`kpi kpi--${tone}`}>
      <span className="kpi__label">{label}</span>
      <div className="kpi__value">
        <strong>{value}</strong>
        {unit && <span>{unit}</span>}
      </div>
      <p>{context}</p>
    </article>
  );
}

function SpecRow({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
}) {
  return (
    <div className="spec-row">
      <div>
        <span>{label}</span>
        {note && <small>{note}</small>}
      </div>
      <p>
        <strong>{value}</strong>
        {unit && <span>{unit}</span>}
      </p>
    </div>
  );
}

function SubsystemPanel({
  icon,
  code,
  title,
  status,
  tone,
  children,
  footer,
}: {
  icon: ReactNode;
  code: string;
  title: string;
  status: string;
  tone: Tone;
  children: ReactNode;
  footer: string;
}) {
  return (
    <section className="subsystem">
      <header className="subsystem__header">
        <div className="subsystem__identity">
          <span className="subsystem__icon">{icon}</span>
          <div>
            <span>{code}</span>
            <h3>{title}</h3>
          </div>
        </div>
        <StatusPill tone={tone}>{status}</StatusPill>
      </header>
      <div className="subsystem__body">{children}</div>
      <footer>{footer}</footer>
    </section>
  );
}

function ErrorCanvas({ errors }: { errors: FieldError[] }) {
  return (
    <section className="error-canvas" role="alert">
      <span className="error-canvas__icon">{icons.alert}</span>
      <div>
        <span className="eyebrow">Input check required</span>
        <h2>Model output is temporarily unavailable</h2>
        <p>
          Correct the highlighted parameter{errors.length > 1 ? 's' : ''} to
          restore calculated estimates.
        </p>
        <ul>
          {errors.map((error) => (
            <li key={error.field}>{error.message}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function EngineeringPortal() {
  const [inputs, setInputs] = useState(DEFAULT_ENGINEERING_INPUTS);
  const [settledInputs, setSettledInputs] = useState(inputs);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettledInputs(inputs), 280);
    return () => window.clearTimeout(timer);
  }, [inputs]);

  const isRecalculating = inputs !== settledInputs;
  const result = useMemo(
    () => calculateEngineeringModel(settledInputs),
    [settledInputs],
  );
  const immediateErrors = useMemo(
    () => calculateEngineeringModel(inputs).errors,
    [inputs],
  );
  const errorsByField = new Map(
    immediateErrors.map((error) => [error.field, error.message]),
  );

  const updateInput = (field: InputField, value: number) => {
    setInputs((current) => ({ ...current, [field]: value }));
  };

  const resetInputs = () => setInputs({ ...DEFAULT_ENGINEERING_INPUTS });

  return (
    <main className="portal-shell">
      <header className="command-bar">
        <div className="brand">
          <span className="brand__mark">{icons.mark}</span>
          <div>
            <strong>JARYAN</strong>
            <span>ENGINEERING SYSTEMS</span>
          </div>
        </div>
        <div className="command-bar__title">
          <span className="breadcrumb">Workspace / Concept study</span>
          <h1>Engineering Portal</h1>
        </div>
        <div className="command-bar__status">
          <StatusPill tone="good" pulse={!isRecalculating}>
            {isRecalculating ? 'Updating model' : 'Model ready'}
          </StatusPill>
          <span className="command-bar__mode">LOCAL · ESTIMATE</span>
        </div>
      </header>

      <section className="project-strip" aria-label="Study summary">
        <div className="project-strip__identity">
          <span className="project-code">CONCEPT / 001</span>
          <div>
            <h2>Off-grid shelter study</h2>
            <p>
              User-defined parameters · deterministic browser calculation
            </p>
          </div>
        </div>
        <dl className="project-strip__meta">
          <div>
            <dt>Data source</dt>
            <dd>User input</dd>
          </div>
          <div>
            <dt>Model class</dt>
            <dd>Concept estimate</dd>
          </div>
          <div>
            <dt>Persistence</dt>
            <dd>Not connected</dd>
          </div>
        </dl>
      </section>

      <div className="workspace-grid">
        <aside className="input-rail" aria-label="Model parameters">
          <PanelHeading
            eyebrow="Input control"
            title="Model parameters"
            description="Adjust bounded concept inputs. Values remain in this browser session only."
            action={
              <button className="text-button" type="button" onClick={resetInputs}>
                Reset defaults
              </button>
            }
          />

          <div className="input-groups">
            <InputGroup
              icon={icons.location}
              index="01"
              title="Site"
              description="Location proxy used by the solar heuristic."
            >
              <NumberControl
                field="latitudeDeg"
                label="Latitude"
                unit="deg"
                hint="Used only to estimate annualized peak sun hours."
                value={inputs.latitudeDeg}
                step={0.1}
                error={errorsByField.get('latitudeDeg')}
                onChange={updateInput}
              />
            </InputGroup>

            <InputGroup
              icon={icons.structure}
              index="02"
              title="Envelope geometry"
              description="Spherical-cap quantity screening."
            >
              <div className="control-grid">
                <NumberControl
                  field="domeRadiusM"
                  label="Base radius"
                  unit="m"
                  hint="Horizontal radius at the dome base."
                  value={inputs.domeRadiusM}
                  step={0.1}
                  error={errorsByField.get('domeRadiusM')}
                  onChange={updateInput}
                />
                <NumberControl
                  field="domeHeightM"
                  label="Dome height"
                  unit="m"
                  hint="Vertical height of the modeled cap."
                  value={inputs.domeHeightM}
                  step={0.1}
                  error={errorsByField.get('domeHeightM')}
                  onChange={updateInput}
                />
              </div>
              <NumberControl
                field="wallThicknessM"
                label="Envelope thickness"
                unit="m"
                hint="Uniform nominal thickness; openings are not deducted."
                value={inputs.wallThicknessM}
                step={0.05}
                error={errorsByField.get('wallThicknessM')}
                onChange={updateInput}
              />
            </InputGroup>

            <InputGroup
              icon={icons.solar}
              index="03"
              title="Energy system"
              description="PV generation and nominal storage sizing."
            >
              <NumberControl
                field="dailyDemandKwh"
                label="Daily demand"
                unit="kWh"
                hint="Average electrical load over a 24-hour period."
                value={inputs.dailyDemandKwh}
                step={0.5}
                error={errorsByField.get('dailyDemandKwh')}
                onChange={updateInput}
              />
              <div className="control-grid">
                <NumberControl
                  field="autonomyDays"
                  label="Autonomy"
                  unit="days"
                  hint="Storage duration without generation."
                  value={inputs.autonomyDays}
                  step={0.5}
                  error={errorsByField.get('autonomyDays')}
                  onChange={updateInput}
                />
                <NumberControl
                  field="panelWattage"
                  label="Panel rating"
                  unit="Wp"
                  hint="Nominal module rating."
                  value={inputs.panelWattage}
                  step={10}
                  error={errorsByField.get('panelWattage')}
                  onChange={updateInput}
                />
              </div>
            </InputGroup>

            <InputGroup
              icon={icons.water}
              index="04"
              title="Water storage"
              description="Occupancy-led potable demand allowance."
            >
              <div className="control-grid">
                <NumberControl
                  field="occupants"
                  label="Occupants"
                  unit="people"
                  hint="Design occupancy."
                  value={inputs.occupants}
                  step={1}
                  error={errorsByField.get('occupants')}
                  onChange={updateInput}
                />
                <NumberControl
                  field="storageDays"
                  label="Storage"
                  unit="days"
                  hint="Target reserve duration."
                  value={inputs.storageDays}
                  step={1}
                  error={errorsByField.get('storageDays')}
                  onChange={updateInput}
                />
              </div>
            </InputGroup>
          </div>
        </aside>

        <section className="output-canvas" aria-label="Calculated outputs">
          <PanelHeading
            eyebrow="System output"
            title="Concept telemetry"
            description="Calculated estimates update after input changes settle."
            action={
              <div
                className={`recalculation-state ${
                  isRecalculating ? 'recalculation-state--active' : ''
                }`}
                role="status"
                aria-live="polite"
              >
                <span />
                {isRecalculating ? 'Recalculating' : 'Calculation current'}
              </div>
            }
          />

          {!result.ok ? (
            <ErrorCanvas errors={result.errors} />
          ) : (
            <>
              <section className="kpi-strip" aria-label="Headline metrics">
                <Kpi
                  label="Solar resource"
                  value={formatNumber(result.outputs.peakSunHours)}
                  unit="h/day"
                  context="Latitude heuristic"
                  tone="good"
                />
                <Kpi
                  label="PV array"
                  value={String(result.outputs.recommendedPanelCount)}
                  unit="panels"
                  context={`${formatNumber(
                    result.outputs.installedSolarCapacityKw,
                  )} kWp installed`}
                />
                <Kpi
                  label="Battery bank"
                  value={formatNumber(result.outputs.batteryCapacityKwh)}
                  unit="kWh"
                  context={`${formatNumber(
                    settledInputs.autonomyDays,
                  )} days autonomy`}
                />
                <Kpi
                  label="Water reserve"
                  value={formatNumber(
                    result.outputs.recommendedTankM3,
                    2,
                  )}
                  unit="m³"
                  context={`${formatNumber(
                    result.outputs.recommendedTankL,
                    0,
                  )} L nominal`}
                />
                <Kpi
                  label="Geometry screen"
                  value={
                    result.outputs.geometryStatus === 'balanced'
                      ? 'Balanced'
                      : 'Review'
                  }
                  context={`H/D ratio ${formatNumber(
                    result.outputs.geometryRatio,
                    2,
                  )}`}
                  tone={
                    result.outputs.geometryStatus === 'balanced'
                      ? 'good'
                      : 'caution'
                  }
                />
              </section>

              <div className="subsystem-grid">
                <SubsystemPanel
                  icon={icons.structure}
                  code="STR / 01"
                  title="Envelope quantity"
                  status={
                    result.outputs.geometryStatus === 'balanced'
                      ? 'Geometry in band'
                      : 'Geometry review'
                  }
                  tone={
                    result.outputs.geometryStatus === 'balanced'
                      ? 'good'
                      : 'caution'
                  }
                  footer="Quantity model: spherical-cap surface × nominal thickness × 1.10 allowance."
                >
                  <SpecRow
                    label="Modeled envelope area"
                    value={formatNumber(result.outputs.domeEnvelopeAreaM2)}
                    unit="m²"
                    note="Openings not deducted"
                  />
                  <SpecRow
                    label="Material volume"
                    value={formatNumber(
                      result.outputs.estimatedWallMaterialM3,
                    )}
                    unit="m³"
                    note="Includes 10% allowance"
                  />
                  <SpecRow
                    label="Indicative material mass"
                    value={formatNumber(result.outputs.estimatedWallMassT)}
                    unit="t"
                    note="At 1,800 kg/m³"
                  />
                  <SpecRow
                    label="Height / diameter"
                    value={formatNumber(result.outputs.geometryRatio, 2)}
                    note="Screening band: 0.55–0.85"
                  />
                </SubsystemPanel>

                <SubsystemPanel
                  icon={icons.solar}
                  code="ENR / 02"
                  title="Solar and storage"
                  status="Demand covered"
                  tone="good"
                  footer="PV model uses an annualized latitude proxy, not site weather or shading data."
                >
                  <SpecRow
                    label="Peak sun estimate"
                    value={formatNumber(result.outputs.peakSunHours)}
                    unit="h/day"
                    note="Latitude-derived heuristic"
                  />
                  <SpecRow
                    label="Installed PV capacity"
                    value={formatNumber(
                      result.outputs.installedSolarCapacityKw,
                    )}
                    unit="kWp"
                    note={`${result.outputs.recommendedPanelCount} × ${formatNumber(
                      settledInputs.panelWattage,
                      0,
                    )} Wp`}
                  />
                  <SpecRow
                    label="Estimated daily yield"
                    value={formatNumber(
                      result.outputs.estimatedDailySolarYieldKwh,
                    )}
                    unit="kWh"
                    note="At 0.78 performance ratio"
                  />
                  <SpecRow
                    label="Nominal battery capacity"
                    value={formatNumber(result.outputs.batteryCapacityKwh)}
                    unit="kWh"
                    note="80% usable depth, 90% round-trip"
                  />
                </SubsystemPanel>

                <SubsystemPanel
                  icon={icons.water}
                  code="WTR / 03"
                  title="Water allowance"
                  status={
                    result.outputs.storageMeetsPracticalMinimum
                      ? 'Reserve sized'
                      : 'Minimum applied'
                  }
                  tone={
                    result.outputs.storageMeetsPracticalMinimum
                      ? 'good'
                      : 'caution'
                  }
                  footer="Demand allowance excludes irrigation, firefighting, process use, and rainfall capture."
                >
                  <SpecRow
                    label="Daily occupancy demand"
                    value={formatNumber(result.outputs.dailyWaterUseL, 0)}
                    unit="L/day"
                    note={`${formatNumber(
                      ENGINEERING_ASSUMPTIONS.waterUsePerPersonL,
                      0,
                    )} L per person`}
                  />
                  <SpecRow
                    label="Design reserve"
                    value={formatNumber(
                      result.outputs.dailyWaterUseL * settledInputs.storageDays,
                      0,
                    )}
                    unit="L"
                    note={`${formatNumber(settledInputs.storageDays, 0)} days`}
                  />
                  <SpecRow
                    label="Recommended nominal tank"
                    value={formatNumber(result.outputs.recommendedTankL, 0)}
                    unit="L"
                    note="500 L practical minimum"
                  />
                  <SpecRow
                    label="Tank volume"
                    value={formatNumber(
                      result.outputs.recommendedTankM3,
                      2,
                    )}
                    unit="m³"
                  />
                </SubsystemPanel>
              </div>
            </>
          )}

          <section className="limitations" aria-labelledby="limitations-title">
            <div className="limitations__lead">
              <span className="limitations__icon">{icons.alert}</span>
              <div>
                <span className="eyebrow">Model boundary</span>
                <h2 id="limitations-title">Assumptions & limitations</h2>
                <p>
                  This browser model supports early comparison, not design
                  approval or procurement.
                </p>
              </div>
            </div>
            <ul>
              <li>
                <strong>Structure</strong>
                <span>
                  No soil testing, openings, reinforcement, loads, or code
                  checks.
                </span>
              </li>
              <li>
                <strong>Energy</strong>
                <span>
                  No live weather, shading, temperature, inverter, or battery
                  chemistry model.
                </span>
              </li>
              <li>
                <strong>Water</strong>
                <span>
                  No source yield, treatment, rainfall, fire reserve, or
                  distribution losses.
                </span>
              </li>
            </ul>
          </section>
        </section>
      </div>

      <footer className="portal-footer">
        <span>JARYAN · CONCEPT MODEL 0.1</span>
        <span>Local calculation · No data transmitted or stored</span>
      </footer>
    </main>
  );
}
