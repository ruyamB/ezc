// ETHShala brand mark: the Ethereum octahedron redrawn as line art,
// using the official ETH glyph geometry stroked in currentColor.

export default function Logo({
  size = 22,
  className = "",
  strokeWidth = 1.7,
}: {
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      role="img"
      aria-label="ETHShala logo"
    >
      <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
    </svg>
  );
}
