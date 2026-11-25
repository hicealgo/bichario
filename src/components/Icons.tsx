import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.1,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const JarIcon: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <rect x="7" y="3" width="10" height="3.2" rx="1.4" />
    <path d="M8 6.2V7.8C6 8.6 5 10.4 5 12.6V17.4C5 19.6 6.8 21 9 21H15C17.2 21 19 19.6 19 17.4V12.6C19 10.4 18 8.6 16 7.8V6.2" />
    <path d="M5.5 16.5C8 15.2 10.5 16.8 13 15.8C15.5 14.8 17 15.8 18.5 16.4" />
    <circle cx="11.5" cy="13" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const BrushIcon: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M18.4 4.2a2.1 2.1 0 0 1 2.9 2.9L12.6 15.8l-3.8.9.9-3.8 8.7-8.7Z" />
    <path d="M8.8 16.7c-1.8.4-3.3 1.2-3.8 2.8 1.9.5 4.4-.1 5.3-1.8" />
  </svg>
);

export const MossLeafIcon: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M5 19c1.5-7 6-12.5 14-14-1 7.5-5.5 13-12.5 13.5" />
    <path d="M5 19c3-3 6-6 9.5-9.5" />
    <path d="M10.5 14.5c2 0 3.5.3 4.8.8" />
  </svg>
);

export const BichodexIcon: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M6 4.5h10.5a2 2 0 0 1 2 2V19a1.5 1.5 0 0 1-1.5 1.5H7.2A2.2 2.2 0 0 1 5 18.3V6.5a2 2 0 0 1 1-2Z" />
    <path d="M5 17.5h13.5" />
    <circle cx="11.8" cy="11" r="2.3" />
    <path d="M9.6 9.5 8.4 8.5M14 9.5l1.2-1" />
  </svg>
);

export const SharedJarIcon: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <circle cx="9" cy="9" r="3" />
    <circle cx="16.2" cy="10.2" r="2.4" />
    <path d="M4.2 18.5c.8-2.8 2.8-4.2 5-4.2s4.2 1.4 5 4.2" />
    <path d="M14.5 14.8c1.9.2 3.5 1.3 4.3 3.7" />
  </svg>
);

export const SlidersIcon: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M4 12h16M4 17h16" />
    <circle cx="9" cy="7" r="2.1" fill="currentColor" />
    <circle cx="15.5" cy="12" r="2.1" fill="currentColor" />
    <circle cx="11" cy="17" r="2.1" fill="currentColor" />
  </svg>
);

export const ScribbleIcon: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M4 16.5c2.2-5.5 4.5-6.5 6.2-2.2 1.5 3.7 3.8 2.5 5.4-3.3 1-3.5 2.7-4.3 4.4-2" />
    <circle cx="19.5" cy="16.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

export const ZipExportIcon: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M12 4v10.5" />
    <path d="m8 10.5 4 4 4-4" />
    <path d="M4.5 15.5v2.2A2.3 2.3 0 0 0 6.8 20h10.4a2.3 2.3 0 0 0 2.3-2.3v-2.2" />
  </svg>
);

export const HeartIcon: React.FC<IconProps & { filled?: boolean }> = ({
  size = 18,
  filled,
  className,
}) => (
  <svg
    {...base(size)}
    fill={filled ? 'currentColor' : 'none'}
    className={className}
  >
    <path d="M12 20s-7-4.5-8.6-8.6C2.3 8.6 4 5.5 7 5.2c1.8-.2 3.6.8 5 2.5 1.4-1.7 3.2-2.7 5-2.5 3 .3 4.7 3.4 3.6 6.2C19 15.5 12 20 12 20Z" />
  </svg>
);

export const StarIcon: React.FC<IconProps & { filled?: boolean }> = ({
  size = 18,
  filled,
  className,
}) => (
  <svg
    {...base(size)}
    fill={filled ? 'currentColor' : 'none'}
    className={className}
  >
    <path d="m12 3.5 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3.5Z" />
  </svg>
);

export const SatchelIcon: React.FC<IconProps> = ({ size = 22, className }) => (
  <svg {...base(size)} className={className}>
    <rect x="4" y="8" width="16" height="11.5" rx="3.5" />
    <path d="M8.5 8V6.2A3.5 3.5 0 0 1 12 2.7a3.5 3.5 0 0 1 3.5 3.5V8" />
    <path d="M4.5 12.2h15" />
    <circle cx="12" cy="12.2" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const UndoIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M7.5 8.5H4V5" />
    <path d="M4.5 8.5A7.2 7.2 0 1 1 6.2 17" />
  </svg>
);

export const RedoIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M16.5 8.5H20V5" />
    <path d="M19.5 8.5A7.2 7.2 0 1 0 17.8 17" />
  </svg>
);

export const EraserIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg {...base(size)} className={className}>
    <path d="m14.8 4.8 4.4 4.4a2 2 0 0 1 0 2.8l-6.6 6.6H7.4l-2.6-2.6a2 2 0 0 1 0-2.8l7.2-8.4a2 2 0 0 1 2.8 0Z" />
    <path d="M12.6 18.6h7.4" />
  </svg>
);

export const MirrorIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3.5v17" strokeDasharray="2.5 2.5" />
    <path d="M8.8 7.5 4.2 12l4.6 4.5V7.5Z" />
    <path d="m15.2 7.5 4.6 4.5-4.6 4.5V7.5Z" />
  </svg>
);

export const SparkleIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3c.5 4.2 1.8 5.5 6 6-4.2.5-5.5 1.8-6 6-.5-4.2-1.8-5.5-6-6 4.2-.5 5.5-1.8 6-6Z" />
    <circle cx="18.2" cy="17.8" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const PassportIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg {...base(size)} className={className}>
    <rect x="4.5" y="4" width="15" height="16" rx="3" />
    <circle cx="12" cy="11" r="3.2" />
    <path d="M8.8 11h6.4M12 7.8c1 1 1 5.4 0 6.4M9 16.8h6" />
  </svg>
);

export const FullscreenIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9" />
    <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9" />
    <path d="M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15" />
    <path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
  </svg>
);

export const DropletIcon: React.FC<IconProps> = ({ size = 17, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3.8C12 3.8 6.5 10.2 6.5 14.3a5.5 5.5 0 1 0 11 0C17.5 10.2 12 3.8 12 3.8Z" />
    <path d="M9.6 14.8a2.4 2.4 0 0 0 1.8 2.1" />
  </svg>
);

export const RockIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M5.5 17.5 4 13l3.2-5.5 5.8-1.5 5.2 3.5L20 15l-2.5 3H7.5l-2-.5Z" />
    <path d="M9 12.2c1.2-.8 3-.8 4.2 0" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg {...base(size)} className={className}>
    <path d="M4.5 7h15" />
    <path d="M9.5 4h5" />
    <path d="M7 7v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7" />
  </svg>
);
