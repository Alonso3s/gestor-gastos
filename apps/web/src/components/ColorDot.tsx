interface ColorDotProps {
  color: string;
}

export function ColorDot({ color }: ColorDotProps) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}
