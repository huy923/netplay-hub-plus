import * as React from "react"

export const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <div
    ref={ref}
    className={`shrink-0 bg-border ${orientation === "vertical" ? "h-full w-[1px]" : "h-[1px] w-full"} ${className || ""}`}
    {...props}
  />
))
Separator.displayName = "Separator"
