import { cn } from "@/lib/utils";

interface PageContainerProps {
    children: React.ReactNode;
    className?: string;
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "full";
}

export function PageContainer({
    children,
    className,
    maxWidth = "7xl",
}: PageContainerProps) {
    const maxWidthClass = {
        sm: "max-w-screen-sm",
        md: "max-w-screen-md",
        lg: "max-w-screen-lg",
        xl: "max-w-screen-xl",
        "2xl": "max-w-2xl",
        "3xl": "max-w-3xl",
        "4xl": "max-w-4xl",
        "5xl": "max-w-5xl",
        "6xl": "max-w-6xl",
        "7xl": "max-w-7xl",
        full: "max-w-full",
    }[maxWidth];

    return (
        <div className={cn("mx-auto px-4 md:px-8 w-full", maxWidthClass, className)}>
            {children}
        </div>
    );
}
