import { ShootingStars } from "@/components/ui/shooting-stars";
import { cn } from "@/lib/utils";

interface PageSectionProps {
    children: React.ReactNode;
    className?: string;
    variant?: "default" | "muted" | "glass" | "glass-strong" | "card" | "transparent";
    padding?: "none" | "sm" | "md" | "lg" | "xl" | "2xl";
    withOrbs?: boolean;
    withShootingStars?: boolean;
    id?: string;
}

export function PageSection({
    children,
    className,
    variant = "transparent",
    padding = "lg",
    withOrbs = false,
    withShootingStars = false,
    id,
}: PageSectionProps) {
    const paddingClasses = {
        none: "py-0",
        sm: "py-8",
        md: "py-12",
        lg: "py-16 md:py-24",
        xl: "py-24 md:py-32",
        "2xl": "py-32 md:py-48",
    }[padding];

    const variantClasses = {
        default: "bg-background",
        muted: "bg-card/20 border-y border-border/50",
        glass: "glass",
        "glass-strong": "glass-strong",
        card: "bg-card/30 border-y border-border/50",
        transparent: "",
    }[variant];

    return (
        <section id={id} className={cn("relative overflow-hidden", paddingClasses, variantClasses, className)}>
            {withOrbs && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
                    {/* Deep mystic gradient background */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,40,200,0.15),transparent_70%)] mix-blend-screen" />

                    {/* Animated Orbs */}
                    <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] min-w-[300px] min-h-[300px] rounded-full bg-purple-600/20 blur-[100px] animate-float opacity-40 mix-blend-screen" />
                    <div className="absolute top-[10%] right-[-5%] w-[35vw] h-[35vw] min-w-[250px] min-h-[250px] rounded-full bg-indigo-500/20 blur-[90px] animate-float-slow opacity-30 mix-blend-screen" />
                    <div className="absolute bottom-[-10%] left-[20%] w-[45vw] h-[45vw] min-w-[350px] min-h-[350px] rounded-full bg-fuchsia-600/15 blur-[110px] animate-float opacity-20 mix-blend-screen delay-1000" />

                    {/* Noise Texture Overlay for Texture/Premium feel */}
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                </div>
            )}
            {withShootingStars && <ShootingStars />}
            <div className="relative z-10">{children}</div>
        </section>
    );
}
