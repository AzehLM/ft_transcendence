interface OstromLogoProps {
    size?: number;
}

export function OstromLogo({ size = 36 }: OstromLogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="ostrom-bg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#e8845f" />
                    <stop offset="100%" stopColor="#c24e2e" />
                </linearGradient>
            </defs>

            {/* Rounded square background */}
            <rect width="36" height="36" rx="9" fill="url(#ostrom-bg)" />

            {/* Outer ring — the "O" of Ostrom */}
            <circle cx="18" cy="18" r="10.5" stroke="white" strokeWidth="3" fill="none" />

            {/* Inner ring — zero-knowledge / second layer */}
            <circle cx="18" cy="18" r="4" stroke="white" strokeWidth="2.5" fill="none" />

            {/* Top-right accent arc — suggests motion / data flow */}
            <path
                d="M 23.8 8.6 A 10.5 10.5 0 0 1 27.4 14.2"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.4"
            />
        </svg>
    );
}
