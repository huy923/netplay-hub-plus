import { cn } from "@/lib/utils";
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

export const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        pressed: "bg-accent text-accent-foreground",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2.5",
        lg: "h-11 px-5",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type ToggleProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof toggleVariants> &
  { pressed?: boolean; onPressedChange?: (pressed: boolean) => void }

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, pressed = false, onPressedChange, variant, size, ...props }, ref) => {
    const [isPressed, setIsPressed] = React.useState(pressed)

    const handleClick = () => {
      const newState = !isPressed
      setIsPressed(newState)
      onPressedChange?.(newState)
    }

    return (
      <button
        ref={ref}
        aria-pressed={isPressed}
        className={cn(
          toggleVariants({ variant: isPressed ? "pressed" : "default", size }),
          className
        )}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
Toggle.displayName = "Toggle"
export const ToggleGroup = ({
  children,
  value,
  onValueChange,
  type = "single",
}: {
  children: React.ReactNode
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  type?: "single" | "multiple"
}) => {
  const [selected, setSelected] = React.useState(value)

  const handleValueChange = (newValue: string) => {
    if (type === "single") {
      setSelected(newValue)
      onValueChange?.(newValue)
    } else {
      const arr = Array.isArray(selected) ? selected : []
      const newSelected = arr.includes(newValue) ? arr.filter((v) => v !== newValue) : [...arr, newValue]
      setSelected(newSelected)
      onValueChange?.(newSelected)
    }
  }

  return (
    <div className="inline-flex items-center rounded-md border border-input bg-transparent p-1">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === ToggleGroupItem) {
          const typedChild = child as React.ReactElement<React.ComponentProps<typeof ToggleGroupItem>>
          return React.cloneElement(typedChild, {
            pressed:
              type === "single"
                ? selected === typedChild.props.value
                : (selected as string[])?.includes(typedChild.props.value),
            onPressedChange: () => handleValueChange(typedChild.props.value),
          })
        }
        return child
      })}
    </div>
  )
}

export const ToggleGroupItem = React.forwardRef<
  HTMLButtonElement,
  ToggleProps & { value: string }
>(({ value, ...props }, ref) => <Toggle ref={ref} {...props} />)
ToggleGroupItem.displayName = "ToggleGroupItem"
