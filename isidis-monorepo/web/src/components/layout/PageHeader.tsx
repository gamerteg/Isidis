import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    description?: React.ReactNode;
    badge?: React.ReactNode;
    badgeIcon?: React.ReactNode;
    className?: string;
    titleClassName?: string;
    align?: "left" | "center";
}

export function PageHeader({
    title,
    subtitle,
    description,
    badge,
    badgeIcon,
    className,
    titleClassName,
    align = "left",
}: PageHeaderProps) {
    return (
        <div className={cn("mb-10 animate-fade-in-up", align === "center" ? "text-center" : "", className)}>
            {badge && (
                <div className={cn("flex items-center gap-2 mb-4", align === "center" ? "justify-center" : "")}>
                    {badgeIcon && <span style={{ color: 'var(--violet-bright)' }}>{badgeIcon}</span>}
                    <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground">{badge}</span>
                </div>
            )}
            <h1 className={cn(
                "font-display font-light leading-[0.95] tracking-[-0.02em]",
                titleClassName || (align === "center" ? "text-[40px] md:text-[56px]" : "text-[36px] md:text-[52px]")
            )}>
                {title}
                {subtitle && (
                    <> <em className="italic font-normal text-gradient-aurora">{subtitle}</em></>
                )}
            </h1>
            {description && (
                <p className={cn(
                    "text-muted-foreground mt-4 max-w-2xl leading-relaxed text-base",
                    align === "center" ? "mx-auto" : "md:mx-0"
                )}>
                    {description}
                </p>
            )}
        </div>
    );
}
