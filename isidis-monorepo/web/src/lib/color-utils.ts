/**
 * Utility functions for color manipulation and contrast calculation.
 */

/**
 * Converts a hex color to RGB.
 */
export function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Calculates the luminance of an RGB color.
 */
export function getLuminance(r: number, g: number, b: number) {
    const a = [r, g, b].map(function (v) {
        v /= 255;
        return v <= 0.03928
            ? v / 12.92
            : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Determines the best contrast color (black or white) for a given background hex color.
 */
export function getContrastColor(hex: string) {
    const rgb = hexToRgb(hex);
    if (!rgb) return '#ffffff';
    const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Lightens or darkens a hex color.
 * Positive amount to lighten, negative to darken.
 */
export function adjustColor(hex: string, amount: number) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const r = Math.max(0, Math.min(255, rgb.r + amount));
    const g = Math.max(0, Math.min(255, rgb.g + amount));
    const b = Math.max(0, Math.min(255, rgb.b + amount));

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Sets opacity to a hex color.
 */
export function hexToRgba(hex: string, opacity: number) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}
