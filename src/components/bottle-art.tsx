// Placeholder bottle illustration until fragrance images arrive in Step 3.
// Tinted by rotation so the shelf reads at a glance.
const TINTS: Record<string, [string, string]> = {
  winter: ["#5b6f8f", "#2f3d57"],
  summer: ["#4fa3c7", "#2d6f93"],
  spring: ["#8fb86a", "#56803b"],
  fall: ["#c27a3e", "#83491f"],
  night: ["#5a4a7a", "#2d2340"],
  special: ["#b8924a", "#7a5a22"],
  everyday: ["#a0672b", "#5e3a16"],
};

export function BottleArt({
  rotation,
  fill,
  label,
  className = "",
}: {
  rotation: string | null;
  fill: number | null;
  label: string;
  className?: string;
}) {
  const [light, dark] = TINTS[rotation ?? "everyday"] ?? TINTS.everyday;
  const level = Math.max(0, Math.min(100, fill ?? 100));
  const liquidTop = 34 + (56 * (100 - level)) / 100;
  const id = `g-${label.replace(/[^a-z0-9]/gi, "")}-${rotation ?? "x"}`;

  return (
    <svg viewBox="0 0 80 100" className={className} role="img" aria-label={label}>
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      </defs>
      <rect x="32" y="6" width="16" height="12" rx="3" fill={dark} />
      <rect x="35" y="17" width="10" height="8" fill={dark} opacity=".8" />
      <rect x="14" y="26" width="52" height="68" rx="12" fill={light} opacity=".22" />
      <clipPath id={`${id}-clip`}>
        <rect x="14" y="26" width="52" height="68" rx="12" />
      </clipPath>
      <rect x="14" y={liquidTop} width="52" height="94" fill={`url(#${id})`} clipPath={`url(#${id}-clip)`} />
      <rect x="14" y="26" width="52" height="68" rx="12" fill="none" stroke={dark} strokeOpacity=".35" />
      <rect x="20" y="32" width="6" height="40" rx="3" fill="#fff" opacity=".25" />
    </svg>
  );
}
