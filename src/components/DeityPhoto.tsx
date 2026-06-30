interface Props {
  emoji: string;
  name: string;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  hasGarland?: boolean;
  showName?: boolean;
  selected?: boolean;
}

const SIZES = {
  xs: { w: 40,  h: 50,  emojiPx: 22, border: 2 },
  sm: { w: 54,  h: 66,  emojiPx: 28, border: 2 },
  md: { w: 72,  h: 88,  emojiPx: 38, border: 3 },
  lg: { w: 100, h: 122, emojiPx: 52, border: 3 },
};

export function DeityPhoto({ emoji, name, color, size = 'md', hasGarland = false, showName = false, selected = false }: Props) {
  const { w, h, emojiPx, border } = SIZES[size];

  return (
    <div
      className="relative flex items-center justify-center rounded-md flex-shrink-0 overflow-hidden"
      style={{
        width: w,
        height: h,
        background: `radial-gradient(ellipse at 45% 35%, ${color}28 0%, rgba(25,8,0,0.97) 75%)`,
        border: `${border}px solid ${selected ? color : color + '99'}`,
        boxShadow: [
          `0 0 0 1px rgba(255,220,100,${selected ? '0.4' : '0.15'})`,
          `0 0 ${selected ? 18 : 8}px ${color}${selected ? '60' : '35'}`,
          `inset 0 0 18px rgba(0,0,0,0.55)`,
        ].join(', '),
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      {/* Corner brackets */}
      <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 rounded-tl-sm" style={{ borderColor: `${color}70` }} />
      <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 rounded-tr-sm" style={{ borderColor: `${color}70` }} />
      <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 rounded-bl-sm" style={{ borderColor: `${color}70` }} />
      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 rounded-br-sm" style={{ borderColor: `${color}70` }} />

      {/* Spotlight glow behind emoji */}
      <div
        className="absolute rounded-full"
        style={{
          width: emojiPx * 1.4,
          height: emojiPx * 1.4,
          background: `radial-gradient(circle, ${color}22, transparent 70%)`,
        }}
      />

      {/* Deity emoji */}
      <span
        style={{
          fontSize: emojiPx,
          lineHeight: 1,
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))',
          position: 'relative',
          zIndex: 1,
          paddingBottom: hasGarland ? 10 : 0,
        }}
      >
        {emoji}
      </span>

      {/* Garland */}
      {hasGarland && (
        <div
          className="absolute bottom-0 left-0 right-0 text-center"
          style={{ fontSize: size === 'xs' ? 8 : size === 'sm' ? 10 : 12, lineHeight: '18px' }}
        >
          🌸🌼🌸
        </div>
      )}

      {/* Name plate */}
      {showName && (
        <div
          className="absolute bottom-0 left-0 right-0 text-center"
          style={{
            background: `${color}DD`,
            fontSize: 7,
            fontFamily: "'Cinzel', serif",
            color: '#fff',
            fontWeight: 700,
            padding: '1px 0 2px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {name}
        </div>
      )}
    </div>
  );
}
