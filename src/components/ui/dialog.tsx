import * as React from "react"

export const Dialog = ({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) => {
  const [isOpen, setIsOpen] = React.useState(open ?? false)

  React.useEffect(() => {
    if (open !== undefined) setIsOpen(open)
  }, [open])

  return (
    <div>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) && child.type === DialogTrigger
          ? React.cloneElement(child as any, {
              onClick: () => {
                setIsOpen(true)
                onOpenChange?.(true)
              },
            })
          : null,
      )}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          {React.Children.map(children, (child) =>
            React.isValidElement(child) && child.type === DialogContent ? child : null,
          )}
        </div>
      )}
    </div>
  )
}

export const DialogTrigger = ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
  <button {...props}>{children}</button>
)

export const DialogContent = ({ children, onOpenChange }: { children: React.ReactNode; onOpenChange?: (open: boolean) => void }) => (
  <div className="bg-background border rounded-lg shadow-lg p-6 max-w-sm w-full">
    {React.Children.map(children, (child) =>
      React.isValidElement(child) && child.type === DialogClose
        ? React.cloneElement(child as any, {
            onClick: () => {
              onOpenChange?.(false)
              if (child.props.onClick) child.props.onClick()
            },
          })
        : child,
    )}
  </div>
)

export const DialogClose = ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
  <button {...props}>{children}</button>
)

export const DialogHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`mb-4 ${className || ""}`}>{children}</div>
)

export const DialogTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2 className={`text-lg font-semibold ${className || ""}`}>{children}</h2>
)
