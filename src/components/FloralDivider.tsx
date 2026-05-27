import Image from "next/image";

type FloralDividerProps = {
  className?: string;
};

export function FloralDivider({ className }: FloralDividerProps) {
  return (
    <Image
      src="/images/floral-divider.png"
      alt=""
      width={553}
      height={115}
      className={className}
      priority
      unoptimized
    />
  );
}
