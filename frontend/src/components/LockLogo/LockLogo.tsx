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

            {/*
              Shackle — a closed ring/tube shape.
              Two sub-paths + fill-rule="evenodd":
                outer D-shape (r=9): legs at x=9 and x=27
                inner D-shape (r=5): legs at x=13 and x=23
              The overlap between them is punched out, leaving a hollow 4px-thick arch.
              The flat bottoms (y=22) are hidden by the body rect below.
            */}
            <path
                d="M 9 22 L 9 13 A 9 9 0 0 0 27 13 L 27 22 Z  M 13 22 L 13 13 A 5 5 0 0 0 23 13 L 23 22 Z"
                fill="#c24e2e"
                fillRule="evenodd"
            />

            {/* Body — covers the flat bottoms of both sub-paths */}
            <rect x="6" y="20" width="24" height="14" rx="4" fill="url(#lock-gradient)" />

            {/* Keyhole */}
            <circle cx="18" cy="27" r="2.5" fill="white" />
            <rect x="16.8" y="28.8" width="2.4" height="2.5" rx="1.2" fill="white" />
        </svg>
    );
}
