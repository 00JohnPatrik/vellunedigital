import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  markOnly?: boolean;
  title?: string;
};

export function Logo({ className, markOnly = false, title = "Vellune Digital" }: LogoProps) {
  return (
    <svg
      viewBox={markOnly ? "0 0 80 80" : "0 0 360 80"}
      role="img"
      aria-label={title}
      className={cn("block h-auto w-auto", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="vellune-logo-gold" x1="10" y1="8" x2="70" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D4AF37" />
          <stop offset="0.46" stopColor="#C49725" />
          <stop offset="1" stopColor="#AA771C" />
        </linearGradient>
        <linearGradient id="vellune-logo-gold-light" x1="25" y1="10" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F4D77A" />
          <stop offset="1" stopColor="#B9851D" />
        </linearGradient>
        <linearGradient id="vellune-logo-gold-deep" x1="24" y1="16" x2="48" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#AA771C" />
          <stop offset="1" stopColor="#7D5413" />
        </linearGradient>
        <filter id="vellune-logo-shadow" x="-25%" y="-25%" width="150%" height="160%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity="0.24" />
        </filter>
      </defs>

      <g filter="url(#vellune-logo-shadow)">
        <path d="M10 10H29L40 43L33.5 57L10 10Z" fill="url(#vellune-logo-gold)" />
        <path d="M70 10H51L40 43L46.5 57L70 10Z" fill="url(#vellune-logo-gold-deep)" />
        <path d="M29 10L40 43L34 35L23.5 16L29 10Z" fill="url(#vellune-logo-gold-light)" opacity="0.95" />
        <path d="M51 10L40 43L46 35L56.5 16L51 10Z" fill="#E2BE4D" opacity="0.9" />
        <path d="M33.5 57L40 43L46.5 57L40 69L33.5 57Z" fill="url(#vellune-logo-gold-deep)" />
        <path d="M40 43L46.5 57L40 69V43Z" fill="#D0A12D" opacity="0.75" />
      </g>

      {!markOnly && (
        <>
          <text
            x="89"
            y="35"
            fill="currentColor"
            fontFamily="Sora, Manrope, Arial, sans-serif"
            fontSize="22"
            fontWeight="600"
            letterSpacing="3.2"
          >
            VELLUNE
          </text>
          <text
            x="91"
            y="56"
            fill="currentColor"
            fontFamily="Manrope, Arial, sans-serif"
            fontSize="9.5"
            fontWeight="600"
            letterSpacing="5.6"
            opacity="0.62"
          >
            DIGITAL
          </text>
        </>
      )}
    </svg>
  );
}

export default Logo;
