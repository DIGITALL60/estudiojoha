export default function LogoIcon({ size = 52 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Joha Molinero Beauty Studio"
    >
      {/* Outer circle */}
      <circle cx="100" cy="100" r="96" stroke="hsl(340 45% 68%)" strokeWidth="2.5" fill="none" />

      {/* Curved top text: JOHA MOLINERO */}
      <defs>
        <path id="topArc" d="M 22,100 A 78,78 0 0,1 178,100" />
      </defs>
      <text fontSize="17" fontFamily="Montserrat, sans-serif" fontWeight="500" letterSpacing="3" fill="hsl(340 45% 68%)">
        <textPath href="#topArc" startOffset="50%" textAnchor="middle">JOHA MOLINERO</textPath>
      </text>

      {/* Stylised face — brow */}
      <path
        d="M 76 88 Q 86 82 96 86"
        stroke="hsl(30 20% 88%)"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* eye */}
      <path
        d="M 83 94 Q 86 91 89 94"
        stroke="hsl(30 20% 88%)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* nose line */}
      <line x1="94" y1="86" x2="97" y2="106" stroke="hsl(30 20% 88%)" strokeWidth="2.5" strokeLinecap="round" />

      {/* Stylised open hand / palm */}
      {/* palm base */}
      <path
        d="M 72 128 Q 78 118 88 116 Q 100 114 112 116 Q 122 118 126 128"
        stroke="hsl(30 20% 88%)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* fingers spreading up */}
      <line x1="82" y1="116" x2="79" y2="107" stroke="hsl(30 20% 88%)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="90" y1="115" x2="88" y2="104" stroke="hsl(30 20% 88%)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="99" y1="114" x2="99" y2="103" stroke="hsl(30 20% 88%)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="108" y1="115" x2="110" y2="104" stroke="hsl(30 20% 88%)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="116" y1="116" x2="120" y2="107" stroke="hsl(30 20% 88%)" strokeWidth="2.2" strokeLinecap="round" />

      {/* Bottom text: beauty studio */}
      <text
        x="100"
        y="162"
        textAnchor="middle"
        fontSize="13"
        fontFamily="Cormorant Garamond, Georgia, serif"
        fontStyle="italic"
        letterSpacing="2"
        fill="hsl(30 20% 70%)"
      >
        beauty studio
      </text>
    </svg>
  );
}
