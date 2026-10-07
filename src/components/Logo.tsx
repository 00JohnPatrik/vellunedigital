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
        <linearGradient id="vellune-gold" x1="10" y1="8" x2="70" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F6D77A" />
          <stop offset="0.42" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#9B6817" />
        </linearGradient>
        <linearGradient id="vellune-gold-light" x1="18" y1="8" x2="37" y2="67" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFF0B0" />
          <stop offset="1" stopColor="#C99628" />
        </linearGradient>
        <linearGradient id="vellune-gold-deep" x1="58" y1="8" x2="43" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#B77C1D" />
          <stop offset="1" stopColor="#70480D" />
        </linearGradient>
        <filter id="vellune-shadow" x="-25%" y="-25%" width="150%" height="170%">
          <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#000000" floodOpacity="0.2" />
        </filter>
      </defs>

      <g filter="url(#vellune-shadow)">
        <path d="M8 8H25L40 49L55 8H72L48 72H32L8 8Z" fill="url(#vellune-gold)" />
        <path d="M8 8H25L40 49L32 72L17 8H8Z" fill="url(#vellune-gold-light)" />
        <path d="M55 8H72L48 72L40 49L55 8Z" fill="url(#vellune-gold-deep)" />
        <path d="M32 72L40 49L48 72Z" fill="#D8AA31" opacity="0.78" />
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
