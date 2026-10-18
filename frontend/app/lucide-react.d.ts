declare module "lucide-react" {
  import type { ComponentType, SVGProps } from "react";
  export type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  const icons: Record<string, LucideIcon>;
  export = icons;
}
