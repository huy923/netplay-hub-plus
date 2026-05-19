import * as React from "react"

export const Sheet = ({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) => {
  const [isOpen, setIsOpen] = React.useState(open ?? false)

  React.useEffect(() => {
    if (open !== undefined) setIsOpen(open)
  }, [open])

  return (
    <div>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) && child.type === SheetTrigger
          ? React.cloneElement(child as any, {
            onClick: () => {
              setIsOpen(true)
              onOpenChange?.(true)
            },
          })
          : null,
      )}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <div className="fixed right-0 top-0 h-full w-3/4 max-w-sm bg-background border-l shadow-lg flex flex-col">
            {React.Children.map(children, (child) =>
              React.isValidElement(child) && child.type === SheetContent ? child : null,
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export const SheetTrigger = ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
  <button {...props}>{children}</button>
)

export const SheetContent = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6">{children}</div>
)
