export default function Logo({ size = 36 }) {
  return (
    <img
      src="/logo.svg"
      alt="Derma Pocket"
      width={size}
      height={size * (110 / 100)}
      style={{ display: "block" }}
    />
  );
}
