import { Package, Lock, Mail, ArrowRight, Shield } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

function Button({ children, variant = "primary", className = "", type = "button" }: { children: React.ReactNode; variant?: "primary" | "secondary"; className?: string; type?: "button" | "submit" }) {
    const baseStyles = "px-8 py-4 rounded-[12px] font-['IBM_Plex_Sans',sans-serif] font-medium text-[18px] tracking-[0.5px] transition-all hover:scale-105 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] w-full";
    const variantStyles = variant === "primary"
        ? "bg-[#de7356] text-white hover:bg-[#d16649]"
        : "bg-[rgba(230,225,224,0.71)] text-[#2b1008] hover:bg-[rgba(230,225,224,0.9)]";

    return (
        <button type={type} className={`${baseStyles} ${variantStyles} ${className}`}>
            {children}
        </button>
    );
}

function InputField({
    label,
    type = "text",
    icon: Icon,
    placeholder,
    value,
    onChange
}: {
    label: string;
    type?: string;
    icon: any;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className="space-y-3">
            <label className="font-['IBM_Plex_Sans',sans-serif] font-medium text-[18px] text-[#2b1008] block mb-1">
                {label}
            </label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#de7356]">
                    <Icon className="size-6" />
                </div>
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className="w-full pl-16 pr-4 py-5 rounded-[14px] bg-white border-2 border-[rgba(222,115,86,0.2)] focus:border-[#de7356] focus:outline-none font-['IBM_Plex_Sans',sans-serif] text-[18px] text-[#2b1008] placeholder:text-[#2b1008] placeholder:opacity-40 transition-all"
                />
            </div>
        </div>
    );
}

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle login logic here
        console.log("Login:", { email, password });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#fef9f7] to-white flex items-center justify-center px-4 sm:px-8 py-16">
            <div className="w-full max-w-md flex flex-col gap-10">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-4 mb-5">
                        <div className="bg-[#de7356] rounded-[16px] p-4 flex items-center justify-center">
                            <Package className="size-12 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="font-['IBM_Plex_Sans',sans-serif] font-bold text-[40px] text-[#de7356]">
                            ft_box
                        </span>
                    </div>
                    <h1 className="font-['IBM_Plex_Sans',sans-serif] font-bold text-[40px] text-[#2b1008] mb-3">
                        Welcome Back
                    </h1>
                    <p className="font-['IBM_Plex_Sans',sans-serif] text-[18px] text-[#2b1008] opacity-70">
                        Log in to access your secure files
                    </p>
                </div>

                {/* Login Form */}
                <div className="bg-[rgba(230,225,224,0.85)] rounded-[24px] shadow-xl border border-[#e0d6d2] p-10">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                        <InputField
                            label="Email Address"
                            type="email"
                            icon={Mail}
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <InputField
                            label="Password"
                            type="password"
                            icon={Lock}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        {/* Forgot Password Link */}
                        <div className="flex justify-end mt-1">
                            <a
                                href="#"
                                className="font-['IBM_Plex_Sans',sans-serif] text-[14px] text-[#de7356] hover:text-[#d16649] transition-colors"
                            >
                                Forgot password?
                            </a>
                        </div>

                        {/* Security Notice */}
                        <div className="bg-[#eeb9aa] bg-opacity-70 rounded-[12px] p-4 flex gap-4 mt-2 mb-4">
                            <Shield className="size-5 text-[#de7356] flex-shrink-0 mt-0.5" />
                            <p className="font-['IBM_Plex_Sans',sans-serif] text-[14px] text-[#2b1008] leading-relaxed">
                                <strong className="font-['IBM_Plex_Sans',sans-serif] font-semibold">Secure Login:</strong> Your credentials are encrypted locally before being sent to our servers. We never see your actual password.
                            </p>
                        </div>

                        <Button type="submit" variant="primary" className="mt-2 mb-1">
                            Log In
                            <ArrowRight className="inline-block ml-2 size-5" />
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[#2b1008] opacity-20"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-[rgba(230,225,224,0.71)] font-['IBM_Plex_Sans',sans-serif] text-[14px] text-[#2b1008] opacity-60">
                                Don't have an account?
                            </span>
                        </div>
                    </div>

                    {/* Sign Up Link */}
                    <Link
                        to="/signup"
                        className="block text-center font-['IBM_Plex_Sans',sans-serif] font-medium text-[18px] text-[#de7356] hover:text-[#d16649] transition-colors mt-3"
                    >
                        Create Account
                    </Link>
                </div>

                {/* Back to Home */}
                <div className="mt-12 text-center">
                    <Link
                        to="/"
                        className="font-['IBM_Plex_Sans',sans-serif] text-[14px] text-[#2b1008] opacity-60 hover:opacity-100 transition-opacity"
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}