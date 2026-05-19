import * as React from "react"

export const Switch = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean; onCheckedChange?: (checked: boolean) => void }
>(({ className, checked = false, onCheckedChange, ...props }, ref) => {
  const [isChecked, setIsChecked] = React.useState(checked)

  const handleClick = () => {
    const newState = !isChecked
    setIsChecked(newState)
    onCheckedChange?.(newState)
  }

  return (
    <button
      ref={ref}
      role="switch"
      aria-checked={isChecked}
      className={`inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${isChecked ? "bg-primary" : "bg-input"
        } ${className || ""}`}
      onClick={handleClick}
      {...props}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg transition-transform ${isChecked ? "translate-x-5" : "translate-x-0"
          }`}
      />
    </button>
  )
})
Switch.displayName = "Switch"
