import { formatAiAdoptionPhase } from '../../../../utils/formatters';
import {
  AI_ADOPTION_PHASE_BLOG_URL,
  PHASE_DEFINITIONS,
  PHASE_PILL_CLASS,
} from '../aiAdoptionPhaseMetadata';

interface PhaseAssignmentSectionProps {
  sectionId: string;
}

export function PhaseAssignmentSection({ sectionId }: PhaseAssignmentSectionProps) {
  return (
    <div id={sectionId} className="bg-default rounded-md border border-default scroll-mt-28">
      <div className="px-6 py-4 border-b border-default">
        <h3 className="text-lg font-semibold text-default">How phases are assigned</h3>
        <p className="mt-1 text-sm text-muted">
          GitHub classifies each engaged user based on the Copilot surfaces used on at least two days in the rolling
          28-day window.
        </p>
      </div>
      <div className="px-6 py-5">
        <dl className="space-y-3">
          {PHASE_DEFINITIONS.map((phaseDefinition) => (
            <div key={phaseDefinition.phaseNumber} className="rounded-lg border border-default bg-muted p-4">
              <dt>
                <span className={PHASE_PILL_CLASS}>
                  {formatAiAdoptionPhase({
                    phase_number: phaseDefinition.phaseNumber,
                    phase: phaseDefinition.phase,
                    version: 'v1',
                  })}
                </span>
              </dt>
              <dd className="mt-2 text-sm text-muted">{phaseDefinition.description}</dd>
            </div>
          ))}
        </dl>
        <a
          href={AI_ADOPTION_PHASE_BLOG_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex text-sm font-medium text-accent hover:underline"
        >
          Learn More
        </a>
      </div>
    </div>
  );
}
