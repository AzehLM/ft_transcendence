interface LockLogoProps {
    size?: number;
}

export function LockLogo({ size = 36 }: LockLogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="lock-logo-bg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#e8845f" />
                    <stop offset="100%" stopColor="#c24e2e" />
                </linearGradient>
            </defs>

            {/* Rounded square background */}
            <rect width="36" height="36" rx="9" fill="url(#lock-logo-bg)" />

            {/* Shackle — U-shaped arch */}
            <path
                d="M 13 20 L 13 14 A 5 5 0 0 0 23 14 L 23 20"
                stroke="white"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
            />

            {/* Lock body */}
            <rect x="9" y="19" width="18" height="13" rx="3" fill="white" />

            {/* Keyhole — circle */}
            <circle cx="18" cy="23" r="2.2" fill="#c24e2e" />

            {/* Keyhole — slot */}
            <rect x="17" y="24.5" width="2" height="3.5" rx="1" fill="#c24e2e" />
        </svg>
    );
}
