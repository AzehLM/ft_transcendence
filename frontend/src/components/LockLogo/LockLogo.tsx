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
                <linearGradient id="lock-gradient" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#e8845f" />
                    <stop offset="100%" stopColor="#c24e2e" />
                </linearGradient>
            </defs>

            {/* Shackle — drawn first so body covers the leg ends */}
            <path
                d="M 11 22 L 11 13 A 7 7 0 0 0 25 13 L 25 22"
                stroke="url(#lock-gradient)"
                strokeWidth="3.5"
                fill="none"
                strokeLinecap="round"
            />

            {/* Body */}
            <rect x="6" y="20" width="24" height="14" rx="4" fill="url(#lock-gradient)" />

            {/* Keyhole */}
            <circle cx="18" cy="26" r="2.5" fill="white" />
            <rect x="16.8" y="27.8" width="2.4" height="2.8" rx="1.2" fill="white" />
        </svg>
    );
}
