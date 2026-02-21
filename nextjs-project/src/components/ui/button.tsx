import * as React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background"
    
    const variantClasses = {
      default: "bg-action-blue text-gray-800 hover:bg-action-blue/90",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      outline: "border border-input hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-highlight-blue text-text hover:bg-highlight-blue/90",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "underline-offset-4 hover:underline text-primary",
      primary: "bg-action-blue text-gray-800 hover:bg-action-blue/90"
    }
    
    const sizeClasses = {
      default: "h-11 py-2 px-6 min-h-[44px] min-w-[44px]",
      sm: "h-10 px-4 rounded-full min-h-[32px] min-w-[32px]",
      lg: "h-12 px-8 rounded-full min-h-[44px] min-w-[44px]",
      icon: "h-11 w-11 rounded-full"
    }
    
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`
    
    return (
      <button
        className={classes}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export default Button