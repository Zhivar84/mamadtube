import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const MamadTubeLogo: React.FC<LogoProps> = ({
  className = '',
  size = 40,
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Modern TV Mascot Tube Logo */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
      >
        {/* Dark Container Base */}
        <rect
          width="100"
          height="100"
          rx="26"
          fill="#09090B"
          stroke="#27272A"
          strokeWidth="3"
        />

        {/* Antennas */}
        <path
          d="M36 22L46 34M64 22L54 34"
          stroke="#71717A"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Screen Outer Frame */}
        <rect
          x="20"
          y="34"
          width="60"
          height="46"
          rx="14"
          fill="#18181B"
          stroke="#EF4444"
          strokeWidth="3"
        />

        {/* Sharp Play Core */}
        <path
          d="M46 48L58 57L46 66V48Z"
          fill="#FFFFFF"
        />

        {/* Live Indicator Dot */}
        <circle
          cx="70"
          cy="44"
          r="2.5"
          fill="#EF4444"
        />
      </svg>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col tracking-tight text-left">
          <div className="flex items-center text-lg font-black leading-none">
            <span className="text-zinc-100">Mamad</span>
            <span className="text-red-500 ml-1">Tube</span>
          </div>
          <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-semibold mt-0.5">
            Streaming & Media
          </span>
        </div>
      )}
    </div>
  );
};

export default MamadTubeLogo;
