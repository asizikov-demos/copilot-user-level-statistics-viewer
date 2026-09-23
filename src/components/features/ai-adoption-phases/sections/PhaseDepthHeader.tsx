import type { AiAdoptionPhaseReadModel } from '../../../../read-models/aiAdoptionPhases';
import { formatNumber } from '../../../../utils/formatters';

interface PhaseDepthHeaderProps {
  aiAdoptionPhaseData: AiAdoptionPhaseReadModel['aiAdoptionPhaseData'];
}

const PHASE_SEGMENTS = [
  { phaseNumber: 0, label: 'No cohort', summary: 'Below engagement criteria', fill: 'bg-[#d8dee4]', text: 'text-[#424a53]' },
  { phaseNumber: 1, label: 'Phase 1', summary: 'Completions or IDE agent mode', fill: 'bg-[#9ecbff]', text: 'text-[#0a3069]' },
  { phaseNumber: 2, label: 'Phase 2', summary: 'One GitHub agent surface', fill: 'bg-[#218bff]', text: 'text-white' },
  { phaseNumber: 3, label: 'Phase 3', summary: 'Two or more agent surfaces, or Copilot app', fill: 'bg-[#0a3069]', text: 'text-white' },
] as const;

const UNREPORTED_SEGMENT = {
  phaseNumber: -1,
  label: 'Not reported',
  summary: 'No phase in the export',
  fill: 'bg-[#f6f8fa] ring-1 ring-inset ring-[#d1d9e0]',
  text: 'text-[#59636e]',
} as const;

const MIN_LABELLED_SHARE = 5;

function shareOf(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export function PhaseDepthHeader({ aiAdoptionPhaseData }: PhaseDepthHeaderProps) {
  const countByPhase = new Map<number, number>();
  for (const entry of aiAdoptionPhaseData) {
    const phaseNumber = entry.phase.phase_number;
    countByPhase.set(phaseNumber, (countByPhase.get(phaseNumber) ?? 0) + entry.userCount);
  }

  const totalUsers = aiAdoptionPhaseData.reduce((sum, entry) => sum + entry.userCount, 0);
  const knownSegments = PHASE_SEGMENTS.map(segment => ({
    ...segment,
    userCount: countByPhase.get(segment.phaseNumber) ?? 0,
  }));
  const unreportedUsers = totalUsers - knownSegments.reduce((sum, segment) => sum + segment.userCount, 0);
  const segments = unreportedUsers > 0
    ? [...knownSegments, { ...UNREPORTED_SEGMENT, userCount: unreportedUsers }]
    : knownSegments;
  const agentReach = segments
    .filter(segment => segment.phaseNumber >= 2)
    .reduce((sum, segment) => sum + segment.userCount, 0);
  const ribbonSummary = segments
    .map(segment => `${segment.label}: ${formatNumber(segment.userCount)} (${shareOf(segment.userCount, totalUsers)}%)`)
    .join(', ');

  return (
    <section aria-label="Adoption depth" className="mt-6 rounded-lg border border-[#d1d9e0] bg-white p-6">
      {totalUsers === 0 ? (
        <p className="text-sm text-[#59636e]">No AI adoption phase data is available in this metrics upload.</p>
      ) : (
        <>
          <p className="max-w-[32ch] text-balance text-2xl font-semibold leading-tight tracking-tight text-[#1f2328] sm:text-[28px]">
            <span className="tabular-nums">{formatNumber(totalUsers)}</span> {totalUsers === 1 ? 'person' : 'people'} used Copilot.{' '}
            {agentReach > 0 ? (
              <>
                <span className="tabular-nums text-[#0969da]">{formatNumber(agentReach)}</span> reached GitHub agent surfaces.
              </>
            ) : (
              <>None reached GitHub agent surfaces yet.</>
            )}
          </p>

          <div
            role="img"
            aria-label={`Users by AI adoption phase. ${ribbonSummary}.`}
            className="mt-5 flex h-10 gap-0.5 overflow-hidden rounded-md"
          >
            {segments
              .filter(segment => segment.userCount > 0)
              .map(segment => {
                const share = shareOf(segment.userCount, totalUsers);
                return (
                  <div
                    key={segment.phaseNumber}
                    className={`flex min-w-0 items-center overflow-hidden whitespace-nowrap px-1 text-[11px] font-semibold tabular-nums sm:px-2.5 sm:text-[13px] ${segment.fill} ${segment.text}`}
                    style={{ flexGrow: segment.userCount, flexBasis: 0 }}
                  >
                    {share >= MIN_LABELLED_SHARE ? `${share}%` : null}
                  </div>
                );
              })}
          </div>

          <dl className={`mt-3 grid grid-cols-2 gap-x-5 gap-y-3 ${segments.length > 4 ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
            {segments.map(segment => (
              <div key={segment.phaseNumber} className="min-w-0 text-xs leading-snug text-[#59636e]">
                <dt className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1f2328]">
                  <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-sm ${segment.fill}`} />
                  <span>
                    {segment.label} · <span className="tabular-nums">{formatNumber(segment.userCount)}</span>
                  </span>
                </dt>
                <dd className="mt-0.5">{segment.summary}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
