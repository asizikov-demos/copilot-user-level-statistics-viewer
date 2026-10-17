import { cn } from '../../utils/cn';

export type InitialAvatarSize = 'medium' | 'large';

export interface InitialAvatarProps {
  name: string;
  size?: InitialAvatarSize;
  className?: string;
}

const SIZE_CLASS: Record<InitialAvatarSize, string> = {
  medium: 'h-9 w-9',
  large: 'h-10 w-10',
};

/** Local initial badge for a user login; avoids fetching remote avatar images. */
export default function InitialAvatar({ name, size = 'large', className }: InitialAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex flex-shrink-0 items-center justify-center rounded-full bg-accent-muted text-sm font-medium text-accent',
        SIZE_CLASS[size],
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
