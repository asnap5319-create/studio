import type { SVGProps } from 'react';

export function AsnapLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      {...props}
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <text
        x="50%"
        y="50%"
        dy=".35em"
        textAnchor="middle"
        fontSize="90"
        fontWeight="bold"
        fill="hsl(var(--primary))"
        filter="url(#glow)"
        fontFamily="sans-serif"
      >
        A
      </text>
    </svg>
  );
}
