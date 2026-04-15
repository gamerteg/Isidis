import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    badge?: React.ReactNode;
    badgeIcon?: React.ReactNode;
    className?: string;
    titleClassName?: string;
    align?: "left" | "center";
}

export function PageHeader({
    title,
    description,
    badge,
    badgeIcon,
    className,
    titleClassName,
    align = "left",
}: PageHeaderProps) {
    return (
        <div className={cn("mb-12 animate-fade-in-up", align === "center" ? "text-center" : "", className)}>
            {badge && (
                <Badge
                    variant="outline"
                    className="mb-4 text-xs uppercase tracking-widest text-primary border-primary/20"
                >
                    {badgeIcon && <span className="mr-2">{badgeIcon}</span>}
                    {badge}
                </Badge>
            )}
            <h1 className={cn(
                "font-bold tracking-tight",
                titleClassName || (align === "center" ? "text-3xl md:text-5xl" : "text-3xl md:text-4xl")
            )}>
                {title}
            </h1>
            {description && (
                <p className={cn(
                    "text-muted-foreground mt-4 max-w-2xl leading-relaxed",
                    align === "center" ? "mx-auto" : "md:mx-0"
                )}>
                    {description}
                </p>
            )}
        </div>
    );
}
