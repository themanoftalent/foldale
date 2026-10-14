import React from "react";

export interface MacFolderIconProps {
  color?: string;
  text?: string;
  textColor?: string;
  icon?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

export const MacFolderIcon: React.FC<MacFolderIconProps> = ({
  color = "#007aff",
  text,
  textColor = "#ffffff",
  icon,
  size = "sm",
  className = "",
}) => {
  // Dimension mapping
  const dimensions = {
    sm: { width: 18, height: 15 },
    md: { width: 24, height: 20 },
    lg: { width: 48, height: 40 },
    xl: { width: 72, height: 60 },
    "2xl": { width: 120, height: 100 },
  }[size];

  // Font sizing based on text length
  const cleanText = (text || "").trim().toUpperCase();
  const textLen = cleanText.length;
  const fontSize =
    textLen <= 3 ? 21 : textLen <= 4 ? 17 : textLen <= 5 ? 14 : textLen <= 6 ? 12 : 10;

  // Unique gradient IDs to prevent collisions when multiple icons are rendered
  const idSuffix = React.useId().replace(/:/g, "_");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 84"
      width={dimensions.width}
      height={dimensions.height}
      className={`shrink-0 select-none ${className}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`bg_${idSuffix}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0.88" />
        </linearGradient>
        <linearGradient id={`fg_${idSuffix}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1.0" />
          <stop offset="100%" stopColor={color} stopOpacity="0.92" />
        </linearGradient>
        <filter id={`shadow_${idSuffix}`} x="-5%" y="-5%" width="110%" height="115%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* Back tab & body */}
      <path
        d="M 6 12 C 6 8.5, 8.5 6, 12 6 L 35 6 C 39 6, 42 8.5, 44 11 L 46 14 C 48 16, 50 17, 53 17 L 88 17 C 91.5 17, 94 19.5, 94 23 L 94 72 C 94 75.5, 91.5 78, 88 78 L 12 78 C 8.5 78, 6 75.5, 6 72 Z"
        fill={`url(#bg_${idSuffix})`}
      />

      {/* White Paper Slip Peeking Out */}
      <rect x="11" y="12" width="78" height="20" rx="4" ry="4" fill="#ffffff" opacity="0.96" />

      {/* Front Folder Flap */}
      <rect
        x="6"
        y="20"
        width="88"
        height="58"
        rx="7"
        ry="7"
        fill={`url(#fg_${idSuffix})`}
        filter={`url(#shadow_${idSuffix})`}
      />

      {/* Front Flap Top Subtle Highlight Line */}
      <line
        x1="11"
        y1="21"
        x2="89"
        y2="21"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Center Stamped Text or Symbol */}
      {icon ? (
        <text
          x="50"
          y="52"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="24"
        >
          {icon}
        </text>
      ) : cleanText ? (
        <text
          x="50"
          y="50.5"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
          fontWeight="800"
          fontSize={fontSize}
          fill={textColor || "#ffffff"}
          letterSpacing="0.5px"
        >
          {cleanText}
        </text>
      ) : null}
    </svg>
  );
};

/**
 * Generate a 512x512 high-resolution SVG string representation
 * used for setting the native macOS folder icon in Finder and Desktop.
 */
export function generateFolderSvgString(
  color = "#007aff",
  text?: string,
  textColor = "#ffffff",
  icon?: string
): string {
  const cleanText = (text || "").trim().toUpperCase();
  const textLen = cleanText.length;
  const fontSize =
    textLen <= 3 ? 104 : textLen <= 4 ? 86 : textLen <= 5 ? 72 : textLen <= 6 ? 62 : 50;

  let stamp = "";
  if (icon) {
    stamp = `<text x="256" y="302" text-anchor="middle" dominant-baseline="central" font-size="120">${icon}</text>`;
  } else if (cleanText) {
    stamp = `<text x="256" y="300" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-weight="700" font-size="${fontSize}" fill="${textColor}" letter-spacing="1.5">${cleanText}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="backGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${color}" />
      <stop offset="100%" stop-color="${color}" stop-opacity="0.85" />
    </linearGradient>
    <linearGradient id="frontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${color}" stop-opacity="1.0" />
      <stop offset="100%" stop-color="${color}" stop-opacity="0.9" />
    </linearGradient>
    <filter id="folderShadow" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.22" />
    </filter>
  </defs>

  <!-- Back Tab & Body -->
  <path d="M 40 90 
           C 40 70, 56 55, 76 55 
           L 185 55 
           C 205 55, 220 70, 232 86 
           L 242 100 
           C 252 112, 266 118, 282 118 
           L 436 118 
           C 456 118, 472 134, 472 154 
           L 472 410 
           C 472 432, 454 450, 432 450 
           L 80 450 
           C 58 450, 40 432, 40 410 Z" 
        fill="url(#backGrad)" />

  <!-- White Paper Slip -->
  <rect x="64" y="96" width="384" height="80" rx="16" ry="16" fill="#ffffff" opacity="0.96" />

  <!-- Front Flap -->
  <rect x="40" y="136" width="432" height="314" rx="32" ry="32" fill="url(#frontGrad)" filter="url(#folderShadow)" />

  <!-- Front Flap Top Subtle Highlight Line -->
  <path d="M 72 138 L 440 138" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2.5" stroke-linecap="round" />

  <!-- Stamped Text or Icon Directly on Folder Flap -->
  ${stamp}
</svg>`;
}
