import type { SVGProps } from 'react';

export function AsnapLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="18" height="18" x="3" y="3" rx="4" fill="hsl(var(--primary))" stroke="none" />
      <path
        d="M12 7.5v3l1.5 1.5M12 12h1.5"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="6" stroke="hsl(var(--primary-foreground))" strokeWidth="1.5" />
    </svg>
  );
}
