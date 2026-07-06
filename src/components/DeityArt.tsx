/*
 * Hand-drawn 2D vector portraits for each deity, keyed by idol id.
 * All art lives in a 100 × 120 viewBox (bust portrait, bottom-anchored)
 * so it scales crisply inside any DeityPhoto frame size.
 */

const GOLD   = '#E9B438';
const GOLD_D = '#A8731A';
const GOLD_L = '#FFDE8C';
const HAIR   = '#2E1608';

/* ── Shared pieces ───────────────────────────────────────────── */

function Halo({ color, id }: { color: string; id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor={color} stopOpacity="0.4" />
          <stop offset="60%" stopColor={color} stopOpacity="0.14" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="44" r="38" fill={`url(#${id})`} />
      <circle cx="50" cy="44" r="30" fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 3" />
    </>
  );
}

function Mukut({ tall = 16, jewel = '#D8332A' }: { tall?: number; jewel?: string }) {
  const topY = 30 - tall;
  return (
    <g>
      <path
        d={`M36,30 C36,${30 - tall * 0.55} 40,${30 - tall * 0.62} 43,${30 - tall * 0.38}
            C44,${topY + 2} 47,${topY} 50,${topY}
            C53,${topY} 56,${topY + 2} 57,${30 - tall * 0.38}
            C60,${30 - tall * 0.62} 64,${30 - tall * 0.55} 64,30 Z`}
        fill={GOLD} stroke={GOLD_D} strokeWidth="1"
      />
      <rect x="34" y="29" width="32" height="4.5" rx="1.8" fill={GOLD_D} />
      <rect x="34" y="29" width="32" height="2.2" rx="1.1" fill={GOLD_L} opacity="0.7" />
      <circle cx="50" cy="26" r="2.3" fill={jewel} stroke={GOLD_L} strokeWidth="0.6" />
      <circle cx="43" cy="27.5" r="1.1" fill={GOLD_L} />
      <circle cx="57" cy="27.5" r="1.1" fill={GOLD_L} />
    </g>
  );
}

function Tiara({ jewel = '#D8332A' }: { jewel?: string }) {
  return (
    <g>
      <path d="M36,30 Q50,13 64,30 Q50,22 36,30 Z" fill={GOLD} stroke={GOLD_D} strokeWidth="0.9" />
      <circle cx="50" cy="21" r="2" fill={jewel} stroke={GOLD_L} strokeWidth="0.6" />
      <circle cx="42.5" cy="25" r="1" fill={GOLD_L} />
      <circle cx="57.5" cy="25" r="1" fill={GOLD_L} />
      <path d="M50,23 L50,27" stroke={GOLD_D} strokeWidth="0.8" />
      <circle cx="50" cy="28" r="1.2" fill={jewel} />
    </g>
  );
}

function Eyes({ y = 44, fierce = false }: { y?: number; fierce?: boolean }) {
  const tilt = fierce ? 1.2 : 0;
  return (
    <g>
      <ellipse cx="43.5" cy={y} rx="3.3" ry="2" fill="#FFF9EE" />
      <ellipse cx="56.5" cy={y} rx="3.3" ry="2" fill="#FFF9EE" />
      <circle cx="43.5" cy={y + 0.2} r="1.5" fill="#26130A" />
      <circle cx="56.5" cy={y + 0.2} r="1.5" fill="#26130A" />
      <circle cx="44" cy={y - 0.3} r="0.45" fill="#FFF" />
      <circle cx="57" cy={y - 0.3} r="0.45" fill="#FFF" />
      <path d={`M40,${y - 3 + tilt} Q43.5,${y - 4.8} 47,${y - 3 - tilt}`} stroke="#33200E" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d={`M53,${y - 3 - tilt} Q56.5,${y - 4.8} 60,${y - 3 + tilt}`} stroke="#33200E" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {fierce && (
        <>
          <path d={`M40.4,${y + 1.6} L46.6,${y + 1.6}`} stroke="#B02020" strokeWidth="0.7" strokeLinecap="round" />
          <path d={`M53.4,${y + 1.6} L59.6,${y + 1.6}`} stroke="#B02020" strokeWidth="0.7" strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

function NoseMouth({ skinEdge = '#B9773B', smile = true }: { skinEdge?: string; smile?: boolean }) {
  return (
    <g>
      <path d="M50,45.5 L49.2,49.5 Q50,50.4 50.8,49.5" stroke={skinEdge} strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path d={smile ? 'M46.5,53 Q50,55.8 53.5,53' : 'M46.8,53.4 Q50,54.6 53.2,53.4'} stroke="#8F3B22" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function EarsAndRings({ skin, y = 46 }: { skin: string; y?: number }) {
  return (
    <g>
      <ellipse cx="34.8" cy={y} rx="2.6" ry="4" fill={skin} />
      <ellipse cx="65.2" cy={y} rx="2.6" ry="4" fill={skin} />
      <circle cx="34.8" cy={y + 6} r="1.7" fill={GOLD} stroke={GOLD_D} strokeWidth="0.5" />
      <circle cx="65.2" cy={y + 6} r="1.7" fill={GOLD} stroke={GOLD_D} strokeWidth="0.5" />
    </g>
  );
}

function HeadBase({ skin, hair = true }: { skin: string; hair?: boolean }) {
  return (
    <g>
      {hair && <ellipse cx="50" cy="44" rx="17" ry="19" fill={HAIR} />}
      <ellipse cx="50" cy="44" rx="14.5" ry="16.5" fill={skin} />
    </g>
  );
}

function Bust({ skin, garment, border }: { skin: string; garment: string; border?: string }) {
  return (
    <g>
      <rect x="44.5" y="54" width="11" height="14" rx="4.5" fill={skin} />
      <path d="M19,120 Q22,88 40,77 L44,72 Q50,79 56,72 L60,77 Q78,88 81,120 Z" fill={garment} />
      {border && (
        <path d="M40,77 Q50,86 60,77" stroke={border} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      )}
      <path d="M44,72 Q50,78 56,72 L54.5,69 Q50,73 45.5,69 Z" fill={skin} />
    </g>
  );
}

function Necklace({ pendant = '#D8332A' }: { pendant?: string }) {
  return (
    <g>
      <path d="M42,74 Q50,82 58,74" stroke={GOLD} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="80.5" r="1.8" fill={pendant} stroke={GOLD_L} strokeWidth="0.5" />
    </g>
  );
}

function Lotus({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <path d="M0,0 C-2.5,-7 -1,-11.5 0,-12.5 C1,-11.5 2.5,-7 0,0 Z" fill="#F06FA0" stroke="#C94279" strokeWidth="0.5" />
      <path d="M0,0 C-6,-4 -7.5,-8.5 -7,-10.5 C-4.5,-10 -1.5,-6 0,0 Z" fill="#F58BB4" stroke="#C94279" strokeWidth="0.5" />
      <path d="M0,0 C6,-4 7.5,-8.5 7,-10.5 C4.5,-10 1.5,-6 0,0 Z" fill="#F58BB4" stroke="#C94279" strokeWidth="0.5" />
      <path d="M0,0 C-9,-1.5 -10.5,-4.5 -10,-6 C-7,-6 -3,-3.5 0,0 Z" fill="#F9A8C6" stroke="#C94279" strokeWidth="0.5" />
      <path d="M0,0 C9,-1.5 10.5,-4.5 10,-6 C7,-6 3,-3.5 0,0 Z" fill="#F9A8C6" stroke="#C94279" strokeWidth="0.5" />
      <path d="M-8,1.5 Q0,5.5 8,1.5 Q0,0.5 -8,1.5 Z" fill="#3E8E5A" />
    </g>
  );
}

/* ── Deities ─────────────────────────────────────────────────── */

function Ganesha() {
  const skin = '#F0A050';
  return (
    <g>
      <Halo color="#FF8C00" id="halo-ganesha" />
      {/* Big ears */}
      <ellipse cx="29" cy="44" rx="9.5" ry="12.5" fill={skin} stroke="#C97B32" strokeWidth="0.8" />
      <ellipse cx="71" cy="44" rx="9.5" ry="12.5" fill={skin} stroke="#C97B32" strokeWidth="0.8" />
      <ellipse cx="30" cy="44" rx="5.5" ry="8.5" fill="#E58F63" />
      <ellipse cx="70" cy="44" rx="5.5" ry="8.5" fill="#E58F63" />
      {/* Torso */}
      <path d="M19,120 Q22,90 38,78 Q50,86 62,78 Q78,90 81,120 Z" fill="#C93A2E" />
      <path d="M38,78 Q50,88 62,78" stroke={GOLD} strokeWidth="1.6" fill="none" />
      {/* Head */}
      <ellipse cx="50" cy="42" rx="16.5" ry="15.5" fill={skin} />
      {/* Tilak */}
      <path d="M47.5,29 L47.5,35.5" stroke="#D8332A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M50,28.5 L50,36" stroke="#D8332A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M52.5,29 L52.5,35.5" stroke="#D8332A" strokeWidth="1.5" strokeLinecap="round" />
      <Eyes y={41} />
      {/* Tusks — right one broken */}
      <path d="M42.5,51 Q39.5,57 41.5,60.5 Q44.5,59.5 45,53 Z" fill="#FFF7E0" stroke="#E0CBA0" strokeWidth="0.5" />
      <path d="M55.5,51 Q57.5,53.5 57,55.5 Q55,55 54.5,52.5 Z" fill="#FFF7E0" stroke="#E0CBA0" strokeWidth="0.5" />
      {/* Trunk */}
      <path
        d="M46.5,49 C44,57 43,65 44.5,73 C45.5,79.5 50,83 55,82.5 C58.2,82.2 60.2,79.8 59.6,77.4
           C59,75.2 56.2,74.6 54.8,76.2 C53,78.2 49.6,77 48.9,72
           C48.1,66 49.6,57.5 52,49.5 Z"
        fill={skin} stroke="#C97B32" strokeWidth="0.8"
      />
      <path d="M46.2,58 Q49,59.4 51.4,58.2" stroke="#C97B32" strokeWidth="0.7" fill="none" />
      <path d="M45.6,64 Q48.4,65.4 50.6,64.2" stroke="#C97B32" strokeWidth="0.7" fill="none" />
      <path d="M45.6,70 Q48.2,71.2 50,70.2" stroke="#C97B32" strokeWidth="0.7" fill="none" />
      <Mukut tall={14} />
    </g>
  );
}

function Lakshmi() {
  const skin = '#F2C98A';
  return (
    <g>
      <Halo color="#FF69B4" id="halo-lakshmi" />
      <Lotus x={17} y={92} />
      <Lotus x={83} y={92} />
      <Bust skin={skin} garment="#E8447A" border={GOLD} />
      <Necklace pendant="#2E9E5B" />
      <HeadBase skin={skin} />
      <EarsAndRings skin={skin} />
      <circle cx="50" cy="37" r="1.4" fill="#D8332A" />
      <Eyes />
      <NoseMouth />
      <Tiara jewel="#2E9E5B" />
      {/* Sari drape over shoulder */}
      <path d="M58,73 Q68,84 66,120 L74,120 Q76,88 60,75 Z" fill="#C9315F" opacity="0.85" />
    </g>
  );
}

function Shiva() {
  const skin = '#9FC4E8';
  return (
    <g>
      <Halo color="#4169E1" id="halo-shiva" />
      {/* Trishul */}
      <g stroke={GOLD} strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="15" y1="118" x2="15" y2="40" />
        <line x1="15" y1="40" x2="15" y2="25" />
        <path d="M15,41 C8,39 5.5,31 8.5,24" />
        <path d="M15,41 C22,39 24.5,31 21.5,24" />
      </g>
      <ellipse cx="15" cy="42" rx="3.6" ry="1.6" fill={GOLD_D} />
      {/* Bare torso with rudraksha + angavastra */}
      <Bust skin={skin} garment={skin} />
      <path d="M40,77 Q56,84 62,120 L74,120 Q70,86 44,74 Z" fill="#E07B2A" opacity="0.9" />
      <g fill="#7A4A22">
        {[42, 45, 48, 51, 54, 58].map(x => (
          <circle key={x} cx={x} cy={74 + Math.abs(50 - x) * -0.1 + (x - 42) * 0.55} r="1.15" />
        ))}
      </g>
      {/* Snake */}
      <path d="M36,68 Q50,75 62,68 Q66,65.5 64.5,61.5" stroke="#4E9B4E" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <ellipse cx="64.6" cy="60.4" rx="1.9" ry="1.5" fill="#3C7F3C" />
      <path d="M65.4,59 L66.6,57.2" stroke="#D8332A" strokeWidth="0.6" strokeLinecap="round" />
      <HeadBase skin={skin} hair={false} />
      <EarsAndRings skin={skin} />
      {/* Jata (hair bun) + crescent moon */}
      <path d="M35,34 Q37,26 44,24 Q42,18 50,14 Q58,18 56,24 Q63,26 65,34 Q50,26 35,34 Z" fill="#4A2E14" />
      <ellipse cx="50" cy="19" rx="8" ry="6.5" fill="#4A2E14" />
      <path d="M60,15 A5,5 0 1 1 58,7.5 A4,4 0 1 0 60,15 Z" fill="#F5F0DC" />
      {/* Tripundra + third eye */}
      <path d="M42,33.5 L58,33.5" stroke="#EFE6D2" strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
      <path d="M41,36.5 L59,36.5" stroke="#EFE6D2" strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
      <path d="M42,39.5 L58,39.5" stroke="#EFE6D2" strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
      <path d="M50,32.5 Q51.5,36.5 50,40.5 Q48.5,36.5 50,32.5 Z" fill="#26130A" stroke="#B02020" strokeWidth="0.5" />
      <Eyes />
      <NoseMouth skinEdge="#6D93BC" smile={false} />
    </g>
  );
}

function Durga() {
  const skin = '#F2C98A';
  return (
    <g>
      <Halo color="#DC143C" id="halo-durga" />
      {/* Trishul (left) */}
      <g stroke={GOLD} strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="14" y1="118" x2="14" y2="42" />
        <line x1="14" y1="42" x2="14" y2="27" />
        <path d="M14,43 C7,41 4.5,33 7.5,26" />
        <path d="M14,43 C21,41 23.5,33 20.5,26" />
      </g>
      {/* Sword (right) */}
      <path d="M86,108 Q91,80 87,50" stroke="#C9CFD8" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M87,50 L86.4,45" stroke="#C9CFD8" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="81.5" y1="108" x2="90.5" y2="108" stroke={GOLD_D} strokeWidth="2" strokeLinecap="round" />
      <line x1="86" y1="108" x2="86" y2="116" stroke={GOLD_D} strokeWidth="2.4" strokeLinecap="round" />
      <Bust skin={skin} garment="#C4262E" border={GOLD} />
      <Necklace pendant={GOLD_L} />
      <HeadBase skin={skin} />
      <EarsAndRings skin={skin} />
      {/* Third eye + bindi */}
      <path d="M50,33 Q51.3,36 50,39 Q48.7,36 50,33 Z" fill="#26130A" stroke="#B02020" strokeWidth="0.5" />
      <Eyes fierce />
      <NoseMouth smile={false} />
      {/* Nose ring */}
      <circle cx="52.5" cy="50" r="1.6" fill="none" stroke={GOLD} strokeWidth="0.8" />
      <Mukut tall={20} jewel="#2E9E5B" />
    </g>
  );
}

function Krishna() {
  const skin = '#6E8FE0';
  return (
    <g>
      <Halo color="#6A0DAD" id="halo-krishna" />
      <Bust skin={skin} garment="#F5C542" border="#D8332A" />
      <Necklace pendant="#D8332A" />
      <HeadBase skin={skin} />
      <EarsAndRings skin={skin} />
      {/* Vaishnav tilak */}
      <path d="M47,31 Q47,37 48.6,39 M53,31 Q53,37 51.4,39" stroke="#F0E8D0" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M50,33 L50,38" stroke="#D8332A" strokeWidth="1.2" strokeLinecap="round" />
      <Eyes />
      <NoseMouth skinEdge="#4E6BB4" />
      <Mukut tall={13} />
      {/* Peacock feather */}
      <path d="M50,15 Q53,7 58,4" stroke="#2E7D4F" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <ellipse cx="59" cy="5" rx="4.2" ry="5.4" fill="#2E7D4F" />
      <ellipse cx="59" cy="5.4" rx="2.6" ry="3.6" fill="#2FA0C9" />
      <ellipse cx="59" cy="5.8" rx="1.3" ry="1.9" fill="#1A2E6E" />
      {/* Flute across chest */}
      <line x1="31" y1="88" x2="73" y2="72" stroke="#C89132" strokeWidth="3.2" strokeLinecap="round" />
      <line x1="31" y1="88" x2="73" y2="72" stroke={GOLD_L} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      {[0.25, 0.4, 0.55, 0.7].map(t => (
        <circle key={t} cx={31 + 42 * t} cy={88 - 16 * t} r="0.8" fill="#6B4A12" />
      ))}
    </g>
  );
}

function Ram() {
  const skin = '#8FBF9F';
  return (
    <g>
      <Halo color="#228B22" id="halo-ram" />
      {/* Bow + string */}
      <path d="M22,34 Q4,76 22,116" stroke="#8B5A2B" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <line x1="22" y1="34" x2="22" y2="116" stroke="#E4D6A8" strokeWidth="0.8" />
      <rect x="10.5" y="71" width="6" height="9" rx="2" fill={GOLD_D} transform="rotate(-8 13.5 75.5)" />
      <Bust skin={skin} garment="#2E7D4F" border={GOLD} />
      <Necklace pendant={GOLD_L} />
      <HeadBase skin={skin} />
      <EarsAndRings skin={skin} />
      {/* Urdhva pundra tilak */}
      <path d="M47,31 Q47,37 48.6,39 M53,31 Q53,37 51.4,39" stroke="#F0E8D0" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M50,33 L50,38" stroke="#D8332A" strokeWidth="1.2" strokeLinecap="round" />
      <Eyes />
      <NoseMouth skinEdge="#639873" />
      <Mukut tall={19} />
    </g>
  );
}

function Hanuman() {
  const skin = '#EE8440';
  return (
    <g>
      <Halo color="#FF4500" id="halo-hanuman" />
      {/* Gada (mace) */}
      <line x1="84" y1="118" x2="84" y2="94" stroke={GOLD_D} strokeWidth="2.6" strokeLinecap="round" />
      <ellipse cx="84" cy="83" rx="8.5" ry="10.5" fill={GOLD} stroke={GOLD_D} strokeWidth="1" />
      <path d="M80,74.5 Q84,83 80,91.5 M88,74.5 Q84,83 88,91.5" stroke={GOLD_D} strokeWidth="0.7" fill="none" />
      <circle cx="84" cy="71" r="2.2" fill={GOLD_D} />
      <ellipse cx="84" cy="94" rx="3.4" ry="1.6" fill={GOLD_D} />
      {/* Torso + sacred thread */}
      <path d="M19,120 Q22,88 40,77 L44,72 Q50,79 56,72 L60,77 Q78,88 81,120 Z" fill="#C93A2E" />
      <path d="M44,72 Q50,78 56,72 L54.5,69 Q50,73 45.5,69 Z" fill={skin} />
      <rect x="44.5" y="54" width="11" height="14" rx="4.5" fill={skin} />
      <path d="M43,75 Q56,90 60,118" stroke="#F2E4C0" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Fur ruff + face */}
      <ellipse cx="50" cy="44" rx="17" ry="18.5" fill="#B4521E" />
      <ellipse cx="50" cy="44" rx="14" ry="16" fill={skin} />
      <ellipse cx="50" cy="51.5" rx="8.5" ry="6.8" fill="#F7C79A" />
      <circle cx="48" cy="50" r="0.7" fill="#8F3B22" />
      <circle cx="52" cy="50" r="0.7" fill="#8F3B22" />
      <path d="M46.5,54.5 Q50,57 53.5,54.5" stroke="#8F3B22" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <EarsAndRings skin={skin} y={44} />
      <path d="M50,31 L50,37" stroke="#D8332A" strokeWidth="1.6" strokeLinecap="round" />
      <Eyes y={43} />
      <Mukut tall={13} />
    </g>
  );
}

function Saraswati() {
  const skin = '#F6E0C4';
  return (
    <g>
      <Halo color="#00CED1" id="halo-saraswati" />
      <Bust skin={skin} garment="#F4EFE4" border="#2FA0A8" />
      <Necklace pendant="#2FA0A8" />
      <HeadBase skin={skin} />
      <EarsAndRings skin={skin} />
      <circle cx="50" cy="37" r="1.4" fill="#D8332A" />
      <Eyes />
      <NoseMouth />
      <Tiara jewel="#2FA0A8" />
      {/* Veena across the body */}
      <line x1="30" y1="101" x2="74" y2="57" stroke="#8B5A2B" strokeWidth="3.4" strokeLinecap="round" />
      <line x1="31.5" y1="99" x2="73" y2="57.5" stroke="#E4D6A8" strokeWidth="0.7" strokeLinecap="round" />
      <line x1="29.5" y1="100.5" x2="72" y2="58" stroke="#E4D6A8" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
      <circle cx="32" cy="99" r="8.5" fill="#A0642F" stroke="#7A4A22" strokeWidth="1" />
      <circle cx="32" cy="99" r="5" fill="#C08A4E" />
      <circle cx="71" cy="60" r="4.4" fill="#A0642F" stroke="#7A4A22" strokeWidth="1" />
      <circle cx="75.5" cy="55" r="1.1" fill="#7A4A22" />
      <circle cx="73" cy="53.5" r="1.1" fill="#7A4A22" />
    </g>
  );
}

/* ── Registry + component ────────────────────────────────────── */

const ART: Record<string, () => React.ReactElement> = {
  ganesha:   Ganesha,
  lakshmi:   Lakshmi,
  shiva:     Shiva,
  durga:     Durga,
  krishna:   Krishna,
  ram:       Ram,
  hanuman:   Hanuman,
  saraswati: Saraswati,
};

// oxlint-disable-next-line react/only-export-components -- lookup helper belongs with the art registry
export function hasDeityArt(key: string): boolean {
  return key.toLowerCase() in ART;
}

export function DeityArt({ deity }: { deity: string }) {
  const Art = ART[deity.toLowerCase()];
  if (!Art) return null;
  return (
    <svg
      viewBox="0 0 100 120"
      preserveAspectRatio="xMidYMax meet"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-label={deity}
      role="img"
    >
      <Art />
    </svg>
  );
}
