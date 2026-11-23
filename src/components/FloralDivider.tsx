import Image from "next/image";

type FloralDividerProps = {
  className?: string;
  /** "color" is the rose-red and green logo; "black" is the original black silhouette. */
  variant?: "color" | "black";
};

const SOURCES = {
  color: "/images/floral-divider-color.png",
  black: "/images/floral-divider.png",
};

export function FloralDivider({ className, variant = "color" }: FloralDividerProps) {
  return (
    <Image
      src={SOURCES[variant]}
      alt=""
      width={553}
      height={115}
      className={className}
      priority
      unoptimized
    />
  );
}
