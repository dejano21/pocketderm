export default function Logo({ size = 36 }) {
  return (
    <img
      src="/logo.svg"
      alt="Derma Pocket"
      width={size}
      height={size * (90 / 80)}
      style={{ display: "block" }}
    />
  );
}
