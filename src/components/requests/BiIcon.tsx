"use client";

type BiIconProps = {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

export function BiIcon({ name, size = 16, className = "", style }: BiIconProps) {
  return (
    <i
      className={`bi bi-${name} ${className}`.trim()}
      style={{ fontSize: size, ...style }}
      aria-hidden
    />
  );
}
