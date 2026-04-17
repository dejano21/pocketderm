export default function Logo({ size = 36 }) {
  // Original viewBox is 1024x544, so aspect ratio is ~1.88:1
  const width = size;
  const height = Math.round(size * (544 / 1024));
  return (
    <img
      src="/logo.svg"
      alt="Derma Pocket"
      width={width}
      height={height}
      style={{ display: "block" }}
    />
  );
}
