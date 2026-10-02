"use client";

import * as React from "react";

/**
 * Embuni ELC logo mark.
 * Uses Deep Maroon (#8B0000) — the primary brand color — for both the shield
 * and emblem. Gold (#F7C744) accents can be added selectively.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Shield outline — deep maroon */}
      <path
        d="M24 3 L42 9 V24 C42 33 34 41 24 45 C14 41 6 33 6 24 V9 Z"
        stroke="#8B0000"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill="#8B0000"
        fillOpacity="0.08"
      />
      {/* Book + ascending bars — maroon */}
      <g stroke="#8B0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M14 18 L24 21 L34 18" />
        <path d="M14 18 V28 L24 31 L34 28 V18" />
        <path d="M24 21 V31" />
        <path d="M17 36 V33" />
        <path d="M21 36 V31" />
        <path d="M27 36 V29" />
        <path d="M31 36 V27" />
      </g>
      {/* Star — gold accent */}
      <path
        d="M24 9.5 L25.2 11.6 L27.6 12 L25.8 13.7 L26.3 16 L24 14.8 L21.7 16 L22.2 13.7 L20.4 12 L22.8 11.6 Z"
        fill="#F7C744"
      />
    </svg>
  );
}
