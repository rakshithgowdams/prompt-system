import { cn } from '../../lib/utils';

interface IconProps {
  name: string;
  size?: number;
  fill?: boolean;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  className?: string;
}

export function Icon({ name, size = 20, fill = false, weight = 300, className }: IconProps) {
  return (
    <span
      className={cn('material-symbols-rounded select-none leading-none shrink-0', className)}
      style={{
        fontSize: size,
        lineHeight: 1,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
