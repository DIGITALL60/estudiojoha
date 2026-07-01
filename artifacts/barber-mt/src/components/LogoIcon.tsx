export default function LogoIcon({ size = 52 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="Joha Molinero Beauty Studio"
      width={size}
      height={size}
      className="object-contain"
    />
  );
}
