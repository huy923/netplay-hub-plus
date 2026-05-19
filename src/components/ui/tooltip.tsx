import * as React from "react"

export const Tooltip = ({ children, content }: { children: React.ReactNode; content: string }) => {
  const [isVisible, setIsVisible] = React.useState(false)

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg whitespace-nowrap z-50">
          {content}
        </div>
      )}
    </div>
  )
}

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>

export const TooltipTrigger = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props}>{children}</div>
)

export const TooltipContent = ({ children }: { children: React.ReactNode }) => (
  <div className="px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg">{children}</div>
)
