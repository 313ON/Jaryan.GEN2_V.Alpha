'use client';

import dynamic from 'next/dynamic';
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
  SOIL_PROFILES,
  type EngineeringInputs,
  type FieldError,
  type MountingMode,
  type NumericInputField,
  type SoilType,
} from '@jaryan/shared-domain/src/engineering/engineering.ts';
import {
  BASIS_STATUSES,
  STUDY_BASIS,
} from '@jaryan/shared-knowledge/src/claims/study-basis.ts';
import {
  buildFieldCollectionWorklist,
  type FieldCollectionItem,
} from '@jaryan/shared-application/field-collection-worklist.js';
import { REFERENCE_BASIS } from '@jaryan/shared-knowledge/src/claims/reference-basis.ts';
import {
  HARDCODED_ASSUMPTIONS,
  MODEL_BOUNDARY,
} from '@jaryan/shared-knowledge/src/assumptions/model-assumptions.ts';
import { REFERENCES } from '@jaryan/shared-knowledge/src/sources/references.ts';

const SiteMap = dynamic(() => import('./SiteMap'), {
  ssr: false,
  loading: () => (
    <div className="map-fallback" role="status">
      Preparing the browser-only map…
    </div>
  ),
});

interface FieldCollectionGroup {
  readonly title: string;
  readonly items: readonly FieldCollectionItem[];
}

function groupFieldCollectionItems(
  items: readonly FieldCollectionItem[],
): readonly FieldCollectionGroup[] {
  const groups: FieldCollectionGroup[] = [];

  for (const item of items) {
    const current = groups[groups.length - 1];
    if (current?.title === item.groupTitle) {
      groups[groups.length - 1] = {
        title: current.title,
        items: [...current.items, item],
      };
      continue;
    }

    groups.push({
      title: item.groupTitle,
      items: [item],
    });
  }

  return groups;
}

const FIELD_COLLECTION_GROUPS = groupFieldCollectionItems(
  buildFieldCollectionWorklist(STUDY_BASIS),
);

type Tone =
  | 'neutral'
  | 'good'
  | 'caution'
  | 'danger'
  | 'water'
  | 'clay'
  | 'sand';

const icons = {
  mark: (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M3 23c5-1 7-5 9-10 2 5 6 9 17 10" />
      <path d="M5 27h22M9 23c1-8 3-14 7-18 4 4 6 10 7 18" />
      <path d="M8 18h16M11 11h10" />
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
  soil: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18M3 11c3-2 6 2 9 0s6 2 9 0M3 16c3-2 6 2 9 0s6 2 9 0M3 21h18" />
    </svg>
  ),
  solar: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="7" r="3" />
      <path d="M12 1v2M5 7H3M21 7h-2M7 3 5.5 1.5M17 3l1.5-1.5M5 15h14l2 7H3l2-7ZM8 15l-1 7M16 15l1 7M5 18h14" />
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
  print: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 9V3h10v6M7 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-3" />
      <path d="M7 14h10v7H7z" />
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
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span className={`status-pill status-pill--${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}

function PanelHeading({
  eyebrow,
  title,
  description,
  action,
  titleId,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  titleId?: string;
}) {
  return (
    <header className="panel-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2 id={titleId}>{title}</h2>
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
  field: NumericInputField;
  label: string;
  unit: string;
  hint: string;
  value: number;
  step: number;
  error?: string;
  onChange: (field: NumericInputField, value: number) => void;
}) {
  const id = useId();
  const range = INPUT_RANGES[field];
  const messageId = `${id}-message`;

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
          aria-describedby={messageId}
          onChange={(event) =>
            onChange(field, event.currentTarget.valueAsNumber)
          }
        />
        <span aria-hidden="true">{unit}</span>
      </div>
      <p
        className={`control__message ${
          error ? 'control__message--error' : ''
        }`}
        id={messageId}
      >
        {error ?? `${hint} Range ${range.min}–${range.max}.`}
      </p>
    </div>
  );
}

function SelectControl({
  label,
  value,
  hint,
  children,
  onChange,
}: {
  label: string;
  value: string;
  hint: string;
  children: ReactNode;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="control">
      <div className="control__label-row">
        <label htmlFor={id}>{label}</label>
        <span>selection</span>
      </div>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {children}
      </select>
      <p className="control__message">{hint}</p>
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
        <h2>Calculated output is unavailable</h2>
        <p>Correct the highlighted values to restore deterministic estimates.</p>
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
  const [projectName, setProjectName] = useState('Off-grid shelter study');
  const [inputs, setInputs] = useState(DEFAULT_ENGINEERING_INPUTS);
  const [settledInputs, setSettledInputs] = useState(inputs);
  const [mapEnabled, setMapEnabled] = useState(false);
  const [generatedAt, setGeneratedAt] = useState('');

  useEffect(() => {
    setGeneratedAt(new Date().toLocaleString());
  }, []);

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
  const selectedSoil = SOIL_PROFILES[inputs.soilType];

  const updateInput = (field: NumericInputField, value: number) => {
    setInputs((current) => ({ ...current, [field]: value }));
  };

  const updateCoordinates = (latitudeDeg: number, longitudeDeg: number) => {
    setInputs((current) => ({ ...current, latitudeDeg, longitudeDeg }));
  };

  const resetInputs = () => {
    setInputs({ ...DEFAULT_ENGINEERING_INPUTS });
    setProjectName('Off-grid shelter study');
  };

  const printReport = () => {
    setGeneratedAt(new Date().toLocaleString());
    window.setTimeout(() => window.print(), 0);
  };

  return (
    <main className="portal-shell">
      <header className="command-bar">
        <div className="brand">
          <span className="brand__mark">{icons.mark}</span>
          <div>
            <strong>JARYAN</strong>
            <span>FIELD ENGINEERING</span>
          </div>
        </div>
        <div className="command-bar__title">
          <span className="breadcrumb">Workspace / Site study / Local session</span>
          <h1>Engineering field console</h1>
        </div>
        <div className="command-bar__actions">
          <StatusPill tone={isRecalculating ? 'caution' : 'good'}>
            {isRecalculating ? 'Updating model' : 'Estimate current'}
          </StatusPill>
          <button className="print-button" type="button" onClick={printReport}>
            {icons.print}
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </header>

      <section className="project-strip" aria-label="Study summary">
        <div className="project-strip__identity">
          <span className="project-code">CONCEPT / LOCAL</span>
          <div className="project-name-control">
            <label htmlFor="project-name">Study name</label>
            <input
              id="project-name"
              value={projectName}
              maxLength={80}
              onChange={(event) => setProjectName(event.currentTarget.value)}
            />
            <p>User input · included in the printed report</p>
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
            <dd>Session only</dd>
          </div>
        </dl>
      </section>

      <div className="workspace-grid">
        <aside className="input-rail" aria-label="Model parameters">
          <PanelHeading
            eyebrow="User input"
            title="Study parameters"
            description="Bounded inputs feed a deterministic browser model. No values are transmitted or stored by Jaryan."
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
              title="Site coordinates"
              description="Manual coordinates remain the primary accessible control."
            >
              <div className="control-grid">
                <NumberControl
                  field="latitudeDeg"
                  label="Latitude"
                  unit="deg"
                  hint="Used by the solar-resource heuristic."
                  value={inputs.latitudeDeg}
                  step={0.0001}
                  error={errorsByField.get('latitudeDeg')}
                  onChange={updateInput}
                />
                <NumberControl
                  field="longitudeDeg"
                  label="Longitude"
                  unit="deg"
                  hint="Recorded in the study and map position."
                  value={inputs.longitudeDeg}
                  step={0.0001}
                  error={errorsByField.get('longitudeDeg')}
                  onChange={updateInput}
                />
              </div>
              <div className="coordinate-readout">
                <span>Selected coordinate</span>
                <strong>
                  {Number.isFinite(inputs.latitudeDeg)
                    ? inputs.latitudeDeg.toFixed(5)
                    : '—'}
                  ,{' '}
                  {Number.isFinite(inputs.longitudeDeg)
                    ? inputs.longitudeDeg.toFixed(5)
                    : '—'}
                </strong>
              </div>
              <button
                className="map-toggle"
                type="button"
                aria-expanded={mapEnabled}
                onClick={() => setMapEnabled((current) => !current)}
              >
                {mapEnabled ? 'Hide external map' : 'Load interactive map'}
              </button>
              {mapEnabled && (
                <div className="map-panel">
                  <SiteMap
                    latitude={inputs.latitudeDeg}
                    longitude={inputs.longitudeDeg}
                    onCoordinateChange={updateCoordinates}
                  />
                  <p>
                    Map tiles come from OpenStreetMap over the network. Availability
                    is best-effort; no offline map or geocoding is provided.
                  </p>
                </div>
              )}
            </InputGroup>

            <InputGroup
              icon={icons.soil}
              index="02"
              title="Earth material"
              description="A screening category, never a substitute for testing."
            >
              <SelectControl
                label="Soil type"
                value={inputs.soilType}
                hint="Controls density and quantity allowance assumptions."
                onChange={(value) =>
                  setInputs((current) => ({
                    ...current,
                    soilType: value as SoilType,
                  }))
                }
              >
                {Object.values(SOIL_PROFILES).map((profile) => (
                  <option key={profile.value} value={profile.value}>
                    {profile.label}
                  </option>
                ))}
              </SelectControl>
              <div className="soil-note">
                <strong>{selectedSoil.label}</strong>
                <p>{selectedSoil.engineeringMeaning}</p>
                <dl>
                  <div>
                    <dt>Stabilizer</dt>
                    <dd>{selectedSoil.stabilizerAssumption}</dd>
                  </div>
                  <div>
                    <dt>Confidence</dt>
                    <dd>{selectedSoil.qualityNote}</dd>
                  </div>
                </dl>
              </div>
            </InputGroup>

            <InputGroup
              icon={icons.structure}
              index="03"
              title="Envelope geometry"
              description="Spherical-cap quantity screening; not structural analysis."
            >
              <div className="control-grid">
                <NumberControl
                  field="domeRadiusM"
                  label="Base radius"
                  unit="m"
                  hint="Horizontal base radius."
                  value={inputs.domeRadiusM}
                  step={0.1}
                  error={errorsByField.get('domeRadiusM')}
                  onChange={updateInput}
                />
                <NumberControl
                  field="domeHeightM"
                  label="Dome rise"
                  unit="m"
                  hint="Vertical modeled height."
                  value={inputs.domeHeightM}
                  step={0.1}
                  error={errorsByField.get('domeHeightM')}
                  onChange={updateInput}
                />
                <NumberControl
                  field="wallThicknessM"
                  label="Wall thickness"
                  unit="m"
                  hint="Uniform nominal thickness."
                  value={inputs.wallThicknessM}
                  step={0.05}
                  error={errorsByField.get('wallThicknessM')}
                  onChange={updateInput}
                />
                <NumberControl
                  field="openingAreaM2"
                  label="Opening area"
                  unit="m²"
                  hint="Deducted from quantity only."
                  value={inputs.openingAreaM2}
                  step={0.5}
                  error={errorsByField.get('openingAreaM2')}
                  onChange={updateInput}
                />
              </div>
            </InputGroup>

            <InputGroup
              icon={icons.solar}
              index="04"
              title="Energy system"
              description="Annualized PV and nominal storage screen."
            >
              <div className="control-grid">
                <NumberControl
                  field="dailyDemandKwh"
                  label="Daily demand"
                  unit="kWh"
                  hint="Average 24-hour electrical load."
                  value={inputs.dailyDemandKwh}
                  step={0.5}
                  error={errorsByField.get('dailyDemandKwh')}
                  onChange={updateInput}
                />
                <NumberControl
                  field="autonomyDays"
                  label="Solar autonomy"
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
                <NumberControl
                  field="systemVoltageV"
                  label="System voltage"
                  unit="V"
                  hint="Used for nominal battery amp-hours."
                  value={inputs.systemVoltageV}
                  step={12}
                  error={errorsByField.get('systemVoltageV')}
                  onChange={updateInput}
                />
                <NumberControl
                  field="shadingFactor"
                  label="Solar access"
                  unit="ratio"
                  hint="User allowance: 1.0 is unobstructed."
                  value={inputs.shadingFactor}
                  step={0.05}
                  error={errorsByField.get('shadingFactor')}
                  onChange={updateInput}
                />
                <SelectControl
                  label="Mounting mode"
                  value={inputs.mountingMode}
                  hint="Changes installation footprint allowance."
                  onChange={(value) =>
                    setInputs((current) => ({
                      ...current,
                      mountingMode: value as MountingMode,
                    }))
                  }
                >
                  <option value="ground">Ground mount</option>
                  <option value="roof">Roof mount</option>
                </SelectControl>
              </div>
            </InputGroup>

            <InputGroup
              icon={icons.water}
              index="05"
              title="Water reserve"
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
                  label="Reserve duration"
                  unit="days"
                  hint="Target stored-water duration."
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
            eyebrow="Deterministic estimate"
            title="Engineering screening"
            description="Outputs update when valid user input settles. Assumptions and missing measurements are shown alongside results."
            action={
              <div className="recalculation-state" role="status" aria-live="polite">
                <span />
                {isRecalculating ? 'Recalculating' : 'Calculation current'}
              </div>
            }
          />

          {!result.ok ? (
            <ErrorCanvas errors={result.errors} />
          ) : (
            <>
              <section className="quality-banner">
                <div>
                  <span className="eyebrow">Data quality</span>
                  <strong>
                    {result.outputs.dataQualityStatus === 'limited'
                      ? 'Limited — unclassified soil'
                      : 'Screening inputs complete'}
                  </strong>
                </div>
                <p>
                  Coordinates and dimensions are user supplied. No survey,
                  geotechnical, weather, load, or code dataset is connected.
                </p>
              </section>

              <section className="kpi-strip" aria-label="Headline metrics">
                <Kpi
                  label="PV array"
                  value={String(result.outputs.recommendedPanelCount)}
                  unit="modules"
                  context={`${formatNumber(result.outputs.installedSolarCapacityKw)} kWp`}
                  tone="sand"
                />
                <Kpi
                  label="PV footprint"
                  value={formatNumber(result.outputs.pvInstallationFootprintM2)}
                  unit="m²"
                  context={`${formatNumber(result.outputs.pvModuleAreaM2)} m² module face`}
                  tone="good"
                />
                <Kpi
                  label="Earth material"
                  value={formatNumber(result.outputs.estimatedWallMaterialM3)}
                  unit="m³"
                  context={`${formatNumber(result.outputs.estimatedWallMassT)} t indicative mass`}
                  tone="clay"
                />
                <Kpi
                  label="Battery bank"
                  value={formatNumber(result.outputs.batteryCapacityKwh)}
                  unit="kWh"
                  context={`${formatNumber(result.outputs.nominalBatteryCapacityAh, 0)} Ah nominal`}
                />
                <Kpi
                  label="Water reserve"
                  value={formatNumber(result.outputs.recommendedTankM3, 2)}
                  unit="m³"
                  context={`${formatNumber(result.outputs.recommendedTankL, 0)} L tank`}
                  tone="water"
                />
                <Kpi
                  label="Geometry screen"
                  value={
                    result.outputs.geometryStatus === 'screened'
                      ? 'Screened'
                      : 'Review'
                  }
                  context={`H/D ${formatNumber(result.outputs.geometryRatio, 2)}`}
                  tone={
                    result.outputs.geometryStatus === 'screened'
                      ? 'good'
                      : 'caution'
                  }
                />
              </section>

              <div className="subsystem-grid">
                <SubsystemPanel
                  icon={icons.structure}
                  code="MAT / 01"
                  title="Envelope & earth"
                  status={
                    result.outputs.geometryStatus === 'screened'
                      ? 'Quantity screened'
                      : 'Review flags'
                  }
                  tone={
                    result.outputs.geometryStatus === 'screened'
                      ? 'good'
                      : 'caution'
                  }
                  footer={`Net cap area × thickness × ${result.outputs.soilProfile.materialAllowanceFactor.toFixed(2)} ${result.outputs.soilProfile.label.toLowerCase()} allowance. Openings are not structurally checked.`}
                >
                  <SpecRow
                    label="Gross curved envelope"
                    value={formatNumber(result.outputs.grossEnvelopeAreaM2)}
                    unit="m²"
                    note="Spherical-cap surface"
                  />
                  <SpecRow
                    label="Net quantity area"
                    value={formatNumber(result.outputs.netEnvelopeAreaM2)}
                    unit="m²"
                    note={`${formatNumber(settledInputs.openingAreaM2)} m² openings deducted`}
                  />
                  <SpecRow
                    label="Approximate material volume"
                    value={formatNumber(result.outputs.estimatedWallMaterialM3)}
                    unit="m³"
                  />
                  <SpecRow
                    label="Indicative compacted mass"
                    value={formatNumber(result.outputs.estimatedWallMassT)}
                    unit="t"
                    note={`${formatNumber(result.outputs.soilProfile.compactedDensityKgM3, 0)} kg/m³ assumption`}
                  />
                  {result.outputs.structuralWarnings.map((warning) => (
                    <p className="subsystem-warning" key={warning}>
                      {warning}
                    </p>
                  ))}
                </SubsystemPanel>

                <SubsystemPanel
                  icon={icons.solar}
                  code="ENR / 02"
                  title="PV, area & storage"
                  status={
                    result.outputs.solarDemandCovered
                      ? 'Modeled demand covered'
                      : 'Demand not covered'
                  }
                  tone={result.outputs.solarDemandCovered ? 'good' : 'danger'}
                  footer="Latitude heuristic × 0.78 performance ratio × user solar-access factor. No seasonal weather, tilt, temperature, or inverter model."
                >
                  <SpecRow
                    label="Peak sun heuristic"
                    value={formatNumber(result.outputs.peakSunHours)}
                    unit="h/day"
                  />
                  <SpecRow
                    label="Installed PV capacity"
                    value={formatNumber(result.outputs.installedSolarCapacityKw)}
                    unit="kWp"
                    note={`${result.outputs.recommendedPanelCount} × ${formatNumber(settledInputs.panelWattage, 0)} Wp`}
                  />
                  <SpecRow
                    label="Expected daily generation"
                    value={formatNumber(result.outputs.estimatedDailySolarYieldKwh)}
                    unit="kWh"
                    note={`${formatNumber(result.outputs.solarGenerationMarginKwh)} kWh modeled margin`}
                  />
                  <SpecRow
                    label="One-module face area"
                    value={formatNumber(result.outputs.panelFaceAreaM2, 2)}
                    unit="m²"
                    note={`${ENGINEERING_ASSUMPTIONS.modulePowerDensityWm2} W/m² assumption`}
                  />
                  <SpecRow
                    label="PV module-only area"
                    value={formatNumber(result.outputs.pvModuleAreaM2)}
                    unit="m²"
                    note="Panel rectangles only"
                  />
                  <SpecRow
                    label="Installation footprint"
                    value={formatNumber(result.outputs.pvInstallationFootprintM2)}
                    unit="m²"
                    note={`${result.outputs.installationFootprintFactor.toFixed(2)} row, tilt, access, BOS & layout factor`}
                  />
                  <SpecRow
                    label="Nominal battery"
                    value={formatNumber(result.outputs.batteryCapacityKwh)}
                    unit="kWh"
                    note={`${formatNumber(result.outputs.nominalBatteryCapacityAh, 0)} Ah at ${formatNumber(settledInputs.systemVoltageV, 0)} V`}
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
                      ? 'water'
                      : 'caution'
                  }
                  footer="Occupancy allowance excludes source yield, rainfall capture, treatment losses, irrigation, process demand, and fire reserve."
                >
                  <SpecRow
                    label="Daily occupancy demand"
                    value={formatNumber(result.outputs.dailyWaterUseL, 0)}
                    unit="L/day"
                    note={`${ENGINEERING_ASSUMPTIONS.waterUsePerPersonL} L/person/day assumption`}
                  />
                  <SpecRow
                    label="Calculated reserve"
                    value={formatNumber(result.outputs.designReserveL, 0)}
                    unit="L"
                    note={`${formatNumber(settledInputs.storageDays, 0)} days`}
                  />
                  <SpecRow
                    label="Recommended nominal tank"
                    value={formatNumber(result.outputs.recommendedTankL, 0)}
                    unit="L"
                    note={`${ENGINEERING_ASSUMPTIONS.minimumPracticalTankL} L minimum`}
                  />
                </SubsystemPanel>
              </div>
            </>
          )}

          <section className="study-boundary" aria-labelledby="study-boundary-title">
            <PanelHeading
              eyebrow="Study boundary"
              title="Engineering basis & requirements"
              description="A requirements register showing what is modeled, entered, still measured, professionally reviewed, or left for a future capability."
            />
            <div className="basis-legend" aria-label="Requirement status legend">
              {BASIS_STATUSES.map((status) => (
                <span key={status} data-status={status}>
                  {status}
                </span>
              ))}
            </div>
            <section
              className="field-worklist"
              aria-labelledby="field-worklist-title"
            >
              <PanelHeading
                eyebrow="Field collection"
                title="Required field measurements"
                titleId="field-worklist-title"
                description="These are field measurements declared as required by the current engineering basis. This informational list records no collection, evidence, verification, or completion state."
              />
              <div className="field-worklist__groups">
                {FIELD_COLLECTION_GROUPS.map((group, groupIndex) => (
                  <section className="field-worklist__group" key={groupIndex}>
                    <h3>{group.title}</h3>
                    <ul>
                      {group.items.map((item, itemIndex) => (
                        <li key={itemIndex}>{item.label}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </section>
            <div className="basis-grid">
              {STUDY_BASIS.map((group) => (
                <section className="basis-card" key={group.title}>
                  <h3>{group.title}</h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.label}>
                        <span>{item.label}</span>
                        <small data-status={item.status}>{item.status}</small>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <aside className="reference-note">
              <strong>{REFERENCE_BASIS.disclaimer}</strong>
              <p>
                Study boundaries were informed by{' '}
                <a
                  href={REFERENCES[0].url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {REFERENCES[0].label}
                </a>
                , the{' '}
                <a
                  href={REFERENCES[1].url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {REFERENCES[1].label}
                </a>
                , and the U.S. DOE/NREL{' '}
                <a
                  href={REFERENCES[2].url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {REFERENCES[2].label}
                </a>
                . Project-specific codes, evaluation reports, and professional
                design remain external requirements.
              </p>
            </aside>
          </section>

          <section className="limitations" aria-labelledby="limitations-title">
            <div className="limitations__lead">
              <span className="limitations__icon">{icons.alert}</span>
              <div>
                <span className="eyebrow">{MODEL_BOUNDARY.eyebrow}</span>
                <h2 id="limitations-title">{MODEL_BOUNDARY.heading}</h2>
                <p>{MODEL_BOUNDARY.description}</p>
              </div>
            </div>
            <ul>
              <li>
                <strong>Missing measurements</strong>
                <span>
                  Survey, soil tests, bearing, loads, climate, shading, water
                  source, and measured demand.
                </span>
              </li>
              <li>
                <strong>Hardcoded assumptions</strong>
                <span>{HARDCODED_ASSUMPTIONS.join(', ')}</span>
              </li>
              <li>
                <strong>Professional review</strong>
                <span>
                  Structure, foundation, openings, reinforcement, code, safety,
                  electrical, potable water, and permitting.
                </span>
              </li>
            </ul>
          </section>
        </section>
      </div>

      <section className="print-report" aria-label="Printable engineering report">
        <header>
          <span>JARYAN.AI · ENGINEERING FIELD CONSOLE</span>
          <h1>{projectName || 'Untitled concept study'}</h1>
          <p>Concept estimate — not certified engineering design</p>
        </header>
        <dl className="print-meta">
          <div><dt>Generated</dt><dd>{generatedAt || 'Current browser session'}</dd></div>
          <div><dt>Coordinates</dt><dd>{settledInputs.latitudeDeg}, {settledInputs.longitudeDeg}</dd></div>
          <div><dt>Data source</dt><dd>User input + hardcoded assumptions</dd></div>
          <div><dt>Persistence</dt><dd>None; session-local</dd></div>
        </dl>
        <section>
          <h2>User inputs</h2>
          <div className="print-grid">
            <SpecRow label="Soil" value={SOIL_PROFILES[settledInputs.soilType].label} />
            <SpecRow label="Dome radius" value={formatNumber(settledInputs.domeRadiusM)} unit="m" />
            <SpecRow label="Dome rise" value={formatNumber(settledInputs.domeHeightM)} unit="m" />
            <SpecRow label="Wall thickness" value={formatNumber(settledInputs.wallThicknessM, 2)} unit="m" />
            <SpecRow label="Opening area" value={formatNumber(settledInputs.openingAreaM2)} unit="m²" />
            <SpecRow label="Daily demand" value={formatNumber(settledInputs.dailyDemandKwh)} unit="kWh" />
            <SpecRow label="Autonomy" value={formatNumber(settledInputs.autonomyDays)} unit="days" />
            <SpecRow label="Panel rating" value={formatNumber(settledInputs.panelWattage, 0)} unit="Wp" />
            <SpecRow label="System voltage" value={formatNumber(settledInputs.systemVoltageV, 0)} unit="V" />
            <SpecRow label="Solar access" value={formatNumber(settledInputs.shadingFactor, 2)} />
            <SpecRow label="Mounting" value={settledInputs.mountingMode} />
            <SpecRow label="Occupants" value={formatNumber(settledInputs.occupants, 0)} />
            <SpecRow label="Water reserve" value={formatNumber(settledInputs.storageDays, 0)} unit="days" />
          </div>
        </section>
        {result.ok && (
          <section>
            <h2>Calculated results</h2>
            <div className="print-grid">
              <SpecRow label="Gross envelope" value={formatNumber(result.outputs.grossEnvelopeAreaM2)} unit="m²" />
              <SpecRow label="Material volume" value={formatNumber(result.outputs.estimatedWallMaterialM3)} unit="m³" />
              <SpecRow label="Material mass" value={formatNumber(result.outputs.estimatedWallMassT)} unit="t" />
              <SpecRow label="PV panels" value={String(result.outputs.recommendedPanelCount)} />
              <SpecRow label="PV capacity" value={formatNumber(result.outputs.installedSolarCapacityKw)} unit="kWp" />
              <SpecRow label="PV module area" value={formatNumber(result.outputs.pvModuleAreaM2)} unit="m²" />
              <SpecRow label="PV footprint" value={formatNumber(result.outputs.pvInstallationFootprintM2)} unit="m²" />
              <SpecRow label="Daily generation" value={formatNumber(result.outputs.estimatedDailySolarYieldKwh)} unit="kWh" />
              <SpecRow label="Battery capacity" value={formatNumber(result.outputs.batteryCapacityKwh)} unit="kWh" />
              <SpecRow label="Water demand" value={formatNumber(result.outputs.dailyWaterUseL, 0)} unit="L/day" />
              <SpecRow label="Tank size" value={formatNumber(result.outputs.recommendedTankL, 0)} unit="L" />
              <SpecRow label="Data quality" value={result.outputs.dataQualityStatus} />
            </div>
          </section>
        )}
        <section className="print-field-worklist">
          <h2>Required field measurements</h2>
          <div className="print-field-worklist__groups">
            {FIELD_COLLECTION_GROUPS.map((group, groupIndex) => (
              <section key={groupIndex}>
                <h3>{group.title}</h3>
                <ul>
                  {group.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item.label}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
        <section className="print-assumptions">
          <h2>Assumptions and limitations</h2>
          <ul>
            <li>PV performance ratio {ENGINEERING_ASSUMPTIONS.solarPerformanceRatio}; solar resource is a latitude heuristic, not site weather.</li>
            <li>Module area uses {ENGINEERING_ASSUMPTIONS.modulePowerDensityWm2} W/m²; footprint includes a {result.ok ? result.outputs.installationFootprintFactor.toFixed(2) : 'mode-dependent'} allowance for row spacing, tilt geometry, maintenance access, balance-of-system space, and irregular layout.</li>
            <li>Battery uses 80% usable depth and 90% round-trip efficiency; chemistry, surge, temperature, and inverter are not designed.</li>
            <li>Water demand uses {ENGINEERING_ASSUMPTIONS.waterUsePerPersonL} L/person/day and excludes treatment, irrigation, fire reserve, and source reliability.</li>
            <li>{selectedSoil.stabilizerAssumption} {selectedSoil.qualityNote}</li>
            <li>No survey, geotechnical investigation, structural analysis, building-code check, weather feed, geocoding, telemetry, backend, or persistence is connected.</li>
          </ul>
        </section>
        <footer>
          Concept estimate — not certified engineering design. Engage qualified
          local professionals and authorities before design, procurement, or construction.
        </footer>
      </section>

      <footer className="portal-footer">
        <span>JARYAN · CONCEPT MODEL 0.2</span>
        <span>Local calculation · No Jaryan backend, auth, telemetry, or persistence</span>
      </footer>
    </main>
  );
}
