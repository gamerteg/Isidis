import type { Config } from "tailwindcss"
// Force rebuild


const config = {
    darkMode: ["class"],
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
        "./index.html"
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            fontFamily: {
                sans: ["Manrope", "sans-serif"],
                serif: ["Playfair Display", "serif"],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                    deep: "hsl(var(--card-deep))",
                    item: "hsl(var(--card-item))",
                },
                "background-deep": "hsl(var(--background-deep))",
                "nav-deep": "hsl(var(--nav-deep))",
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "fade-in-up": {
                    from: { opacity: "0", transform: "translateY(30px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                "fade-in": {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
                "scale-in": {
                    from: { opacity: "0", transform: "scale(0.9)" },
                    to: { opacity: "1", transform: "scale(1)" },
                },
                "float": {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-12px)" },
                },
                "glow-pulse": {
                    "0%, 100%": { boxShadow: "0 0 20px hsl(270 85% 55% / 0.3)" },
                    "50%": { boxShadow: "0 0 40px hsl(270 85% 55% / 0.5)" },
                },
                "gradient-shift": {
                    "0%": { backgroundPosition: "0% 50%" },
                    "50%": { backgroundPosition: "100% 50%" },
                    "100%": { backgroundPosition: "0% 50%" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in-up": "fade-in-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
                "fade-in": "fade-in 0.6s ease-out both",
                "scale-in": "scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
                "float": "float 6s ease-in-out infinite",
                "float-slow": "float 8s ease-in-out infinite",
                "glow-pulse": "glow-pulse 2s ease-in-out infinite",
                "gradient-shift": "gradient-shift 4s ease infinite",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
