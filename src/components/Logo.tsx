import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  markOnly?: boolean;
  title?: string;
};

export function Logo({ className, markOnly = false, title = "Vellune Digital" }: LogoProps) {
  return (
    <svg
      viewBox={markOnly ? "0 0 80 80" : "0 0 330 80"}
      role="img"
      aria-label={title}
      className={cn("block h-auto w-auto", className)}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMinYMid meet"
    >
      <defs>
        <linearGradient id="vellune-logo-gold" x1="8" y1="8" x2="72" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F0CF67" />
          <stop offset="0.42" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#A96F18" />
        </linearGradient>
        <linearGradient id="vellune-logo-gold-highlight" x1="20" y1="8" x2="40" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFE59A" />
          <stop offset="1" stopColor="#C99628" />
        </linearGradient>
        <linearGradient id="vellune-logo-gold-shadow" x1="54" y1="8" x2="40" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#B47A1D" />
          <stop offset="1" stopColor="#77500F" />
        </linearGradient>
        <filter id="vellune-logo-shadow" x="-25%" y="-25%" width="150%" height="160%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity="0.22" />
        </filter>
      </defs>

      <g filter="url(#vellune-logo-shadow)">
        <path
          d="M7 8H28L40 44L52 8H73L47 72H33L7 8Z"
          fill="url(#vellune-logo-gold)"
        />
        <path
          d="M7 8H28L40 44L33 72L19 8H7Z"
          fill="url(#vellune-logo-gold-highlight)"
          opacity="0.96"
        />
        <path
          d="M52 8H73L47 72L40 44L52 8Z"
          fill="url(#vellune-logo-gold-shadow)"
          opacity="0.96"
        />
        <path
          d="M40 44L47 72H33L40 44Z"
          fill="#D8AC35"
          opacity="0.72"
        />
        <path
          d="M28 8H34L40 26L34 18L28 8Z"
          fill="#FFF0B5"
          opacity="0.42"
        />
      </g>

      {!markOnly && (
        <>
          <text
            x="84"
            y="35"
            fill="currentColor"
            fontFamily="Sora, Manrope, Arial, sans-serif"
            fontSize="25"
            fontWeight="600"
            letterSpacing="3.2"
          >
            VELLUNE
          </text>
          <text
            x="86"
            y="56"
            fill="currentColor"
            fontFamily="Manrope, Arial, sans-serif"
            fontSize="10.5"
            fontWeight="600"
            letterSpacing="5.6"
          >
            DIGITAL
          </text>
        </>
      )}
    </svg>
  );
}

export default Logo;
