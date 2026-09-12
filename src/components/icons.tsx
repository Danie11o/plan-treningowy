import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconToday = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8.5 3.5v3M15.5 3.5v3" />
    <path d="M9 15.2l2 2 4-4" />
  </Base>
);

export const IconPlan = (p: IconProps) => (
  <Base {...p}>
    <path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10" />
    <path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" strokeWidth={3} />
  </Base>
);

export const IconHistory = (p: IconProps) => (
  <Base {...p}>
    <path d="M3.8 12a8.2 8.2 0 1 0 2.4-5.8" />
    <path d="M3.5 4.5v4h4" />
    <path d="M12 8v4.4l3 1.9" />
  </Base>
);

export const IconUser = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="3.8" />
    <path d="M4.5 20.5c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" />
  </Base>
);

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
  </Base>
);

export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const IconMinus = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14" />
  </Base>
);

export const IconX = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const IconChevronLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Base>
);

export const IconChevronRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 5l7 7-7 7" />
  </Base>
);

export const IconInfo = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.6h.01" />
  </Base>
);

export const IconTrophy = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11M9.5 20.5h5M12 14v6.5" />
  </Base>
);

export const IconTimer = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 9.5v4.5M9.5 2.5h5" />
  </Base>
);

export const IconTrash = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6.5h16M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13" />
  </Base>
);

export const IconPencil = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    <path d="M13.5 6.5l4 4" />
  </Base>
);

export const IconPlay = (p: IconProps) => (
  <Base {...p}>
    <path d="M7.5 5.5v13l11-6.5-11-6.5Z" fill="currentColor" />
  </Base>
);

export const IconDownload = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
  </Base>
);

export const IconUpload = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 16V5M7 9.5l5-5 5 5M5 20h14" />
  </Base>
);

export const IconShare = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 14.5V4M8 7.5l4-4 4 4" />
    <path d="M6.5 11H5.5v9h13v-9h-1" />
  </Base>
);

/** Skok na skrzynię: łuk lotu nad boxem. */
export const IconJump = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 20.5h18" />
    <rect x="13" y="12.5" width="7" height="8" rx="1.2" />
    <path d="M4.5 18c1-6.5 5-9.8 10.5-8.6" strokeDasharray="2.2 2.6" />
    <path d="M13.2 7.4l2.2 2-2.8 1" />
  </Base>
);

export const IconNote = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 4h10l4 4v12H5V4Z" />
    <path d="M14.5 4v4.5H19M8.5 12.5h7M8.5 16h5" />
  </Base>
);

export const IconFlame = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21c3.6 0 6-2.4 6-5.6 0-3.9-3.4-5.5-3.4-8.9-2 .8-2.6 2.5-2.6 4-1-.6-1.6-1.9-1.4-3.5C8.4 8.3 6 10.9 6 15.4 6 18.6 8.4 21 12 21Z" />
  </Base>
);

export const IconShield = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3 5 5.5v6c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5v-6L12 3Z" />
    <path d="M9 12l2 2 4-4" />
  </Base>
);

export const IconArrowUp = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Base>
);
