import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { cn } from "../lib/utils";
const Card = React.forwardRef(({ className, hoverable = false, bordered = false, compact = false, ...props }, ref) => (_jsx("div", { ref: ref, className: cn("rounded-lg bg-background/70 text-card-foreground shadow-sm", bordered ? "border" : "border  ", hoverable ? "transition-shadow duration-200 hover:shadow-md" : "", compact ? "p-3" : "p-0", className), ...props })));
Card.displayName = "Card";
const CardHeader = React.forwardRef(({ className, spacing = "default", ...props }, ref) => {
    const spacingClasses = {
        compact: "flex flex-col space-y-1 p-4",
        default: "flex flex-col space-y-1.5 p-6",
        relaxed: "flex flex-col space-y-2 p-8",
    };
    return (_jsx("div", { ref: ref, className: cn(spacingClasses[spacing], className), ...props }));
});
CardHeader.displayName = "CardHeader";
const CardTitle = React.forwardRef(({ className, as = "h3", size = "default", ...props }, ref) => {
    const Component = as;
    const sizeClasses = {
        sm: "text-lg",
        default: "text-2xl",
        lg: "text-3xl"
    };
    return (_jsx(Component, { ref: ref, className: cn("font-semibold leading-none tracking-tight", sizeClasses[size], className), ...props }));
});
CardTitle.displayName = "CardTitle";
const CardDescription = React.forwardRef(({ className, size = "default", ...props }, ref) => {
    const sizeClasses = {
        xs: "text-xs",
        sm: "text-sm",
        default: "text-sm"
    };
    return (_jsx("p", { ref: ref, className: cn("text-muted-foreground", sizeClasses[size], className), ...props }));
});
CardDescription.displayName = "CardDescription";
const CardContent = React.forwardRef(({ className, removeTopPadding = true, padding = "default", ...props }, ref) => {
    const paddingClasses = {
        none: "p-0",
        sm: "px-4 py-3",
        default: "p-6",
        lg: "p-8"
    };
    return (_jsx("div", { ref: ref, className: cn(paddingClasses[padding], removeTopPadding && padding !== "none" ? "pt-0" : "", className), ...props }));
});
CardContent.displayName = "CardContent";
const CardFooter = React.forwardRef(({ className, align = "center", direction = "row", ...props }, ref) => {
    const alignClasses = {
        start: "justify-start",
        center: "justify-center",
        end: "justify-end",
        between: "justify-between",
        around: "justify-around"
    };
    const directionClasses = {
        row: "flex-row",
        column: "flex-col"
    };
    return (_jsx("div", { ref: ref, className: cn("flex items-center p-6 pt-0", alignClasses[align], directionClasses[direction], className), ...props }));
});
CardFooter.displayName = "CardFooter";
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
