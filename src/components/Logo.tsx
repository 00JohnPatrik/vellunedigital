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
        <linearGradient id="vellune-gold" x1="8" y1="8" x2="72" y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F7DB82" />
          <stop offset="0.45" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#A46C18" />
        </linearGradient>
        <linearGradient id="vellune-gold-left" x1="10" y1="8" x2="38" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFF2B4" />
          <stop offset="1" stopColor="#C89527" />
        </linearGradient>
        <linearGradient id="vellune-gold-right" x1="70" y1="8" x2="42" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#BC8222" />
          <stop offset="1" stopColor="#805311" />
        </linearGradient>
      </defs>

      <g>
        <path
          d="M8 8H26L40 48L54 8H72L47 67L40 76L33 67L8 8Z"
          fill="url(#vellune-gold)"
        />
        <path
          d="M8 8H21L40 48L33 67L8 8Z"
          fill="url(#vellune-gold-left)"
        />
        <path
          d="M59 8H72L47 67L40 48L59 8Z"
          fill="url(#vellune-gold-right)"
        />
        <path
          d="M33 67L40 48L47 67L40 76Z"
          fill="#D5A52F"
          opacity="0.9"
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
