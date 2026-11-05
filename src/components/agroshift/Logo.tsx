import logo from "@/assets/agroshift_logo.png.asset.json";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logo.url}
      alt="AgroShift — From data to harvest"
      width={184}
      height={118}
      className={cn("h-auto w-36", className)}
    />
  );
}
