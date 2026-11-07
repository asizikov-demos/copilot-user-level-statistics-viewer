import { getIDEMetadata } from '../../utils/ideMetadata';
import { getIDEIcon } from '../icons/IDEIcons';

export default function RequirementComponent({ component, compact = false }: { component: string; compact?: boolean }) {
  const separator = component.indexOf('/');
  const ide = separator < 0 ? component : component.slice(0, separator);
  const metadata = getIDEMetadata(ide);
  if (!metadata?.label) return <span className="break-words [overflow-wrap:anywhere]">{component}</span>;
  const Icon = metadata.iconKey ? getIDEIcon(ide) : null;
  const label = separator < 0 ? metadata.label : `${metadata.label} / ${component.slice(separator + 1)}`;
  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
      {Icon && (
        <span className={`flex shrink-0 items-center justify-center rounded-md border border-default bg-muted ${compact ? 'h-6 w-6' : 'h-9 w-9'}`} aria-hidden="true">
          <Icon size={compact ? 16 : 24} />
        </span>
      )}
      <div className="min-w-0 break-words [overflow-wrap:anywhere]">
        <div className="font-medium">{label}</div>
        <div className="text-muted">{component}</div>
      </div>
    </div>
  );
}
