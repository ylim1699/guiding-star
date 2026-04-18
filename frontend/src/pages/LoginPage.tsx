import { useState, useRef, useEffect } from "react";
import { auth } from "../firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import "./LoginPage.css";

export default function LoginPage({ onLogin }: { onLogin: (user: { phoneNumber: string | null }) => void }) {
    const [phone,   setPhone]   = useState("");
    const [code,    setCode]    = useState("");
    const [confirm, setConfirm] = useState<ConfirmationResult>();
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState("");
    const verifierRef = useRef<RecaptchaVerifier | null>(null);

    useEffect(() => {
        verifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
        return () => { verifierRef.current?.clear(); verifierRef.current = null; };
    }, []);

    async function sendOTP() {
        setLoading(true); setError("");
        try {
            const formatted = phone.startsWith("+") ? phone : `+1${phone.replace(/\D/g, "")}`;
            const result = await signInWithPhoneNumber(auth, formatted, verifierRef.current!);
            setConfirm(result);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to send code. Please try again.");
        } finally { setLoading(false); }
    }

    async function verifyOTP() {
        setLoading(true); setError("");
        try {
            const result = await confirm!.confirm(code);
            onLogin(result.user);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
        } finally { setLoading(false); }
    }

    return (
        <div className="login-page">
            <div className="login-glow-tr" />
            <div className="login-glow-bl" />

            {/* Left pane */}
            <div className="login-left">
                <div className="login-inner">
                    {/* Brand */}
                    <div className="login-brand">
                        <div className="login-brand-icon">
                            {/* Elongated north star + dashed comet tails */}
                            <svg width="60" height="48" viewBox="0 0 44 36" fill="none" style={{ width: 30, height: 24 }} shapeRendering="geometricPrecision">
                                <circle cx="31" cy="14" r="15" fill="rgba(255,255,255,0.1)"/>
                                <circle cx="31" cy="14" r="9"  fill="rgba(255,255,255,0.18)"/>
                                <line x1="26" y1="18" x2="5"  y2="34"   stroke="white" strokeWidth="3"   strokeLinecap="round" strokeDasharray="6.5 4"              opacity="0.88"/>
                                <line x1="23.5" y1="20.5" x2="3" y2="35" stroke="white" strokeWidth="2"   strokeLinecap="round" strokeDasharray="6.5 4" strokeDashoffset="5" opacity="0.5"/>
                                <path d="M31,1 L33.2,11.8 L40,14 L33.2,16.2 L31,27 L28.8,16.2 L22,14 L28.8,11.8 Z" fill="white"/>
                                <circle cx="31" cy="14" r="2.8" fill="rgba(255,255,255,0.7)"/>
                            </svg>
                        </div>
                        <span className="login-brand-name">Comet</span>
                    </div>

                    {/* Hero */}
                    <h1 className="login-headline">
                        Step into the<br />
                        <span className="login-headline-accent">Light.</span>
                    </h1>
                    <p className="login-sub">
                        Enter your phone number to continue your journey with Comet.
                    </p>

                    <div id="recaptcha-container" />
                    {error && <div className="login-error">{error}</div>}

                    {!confirm ? (
                        <div className="login-form">
                            <label className="login-field-label" htmlFor="phone">Phone Number</label>
                            <div className="login-phone-wrap">
                                <div className="login-phone-prefix">
                                    <span className="login-phone-prefix-num">+1</span>
                                    <span className="login-phone-prefix-divider" />
                                </div>
                                <input
                                    id="phone"
                                    className="login-input"
                                    type="tel"
                                    placeholder="(555) 000-0000"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && !loading && phone && sendOTP()}
                                />
                            </div>
                            <button className="login-btn" onClick={sendOTP} disabled={loading || !phone}>
                                {loading ? "Sending..." : <>Send Verification Code <span className="login-btn-arrow">→</span></>}
                            </button>
                        </div>
                    ) : (
                        <div className="login-form">
                            <label className="login-field-label" htmlFor="code">Verification Code</label>
                            <input
                                id="code"
                                className="login-input-plain"
                                type="number"
                                placeholder="· · · · · ·"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && !loading && code && verifyOTP()}
                            />
                            <button className="login-btn" onClick={verifyOTP} disabled={loading || !code}>
                                {loading ? "Verifying..." : <>Confirm & Continue <span className="login-btn-arrow">→</span></>}
                            </button>
                            <p className="login-legal">
                                Didn't get a code?{" "}
                                <a href="#" onClick={e => { e.preventDefault(); setConfirm(undefined); }}>Try again</a>
                            </p>
                        </div>
                    )}

                </div>
            </div>

            {/* Right decorative pane */}
            <aside className="login-right">
                <div className="login-right-bg" />
                <div className="login-right-stars" />
                <div className="login-right-beam login-right-beam-1" />
                <div className="login-right-beam login-right-beam-2" />
                <div className="login-right-beam login-right-beam-3" />
                <div className="login-right-fade" />
                <p className="login-right-label">Guided by Comet</p>
            </aside>
        </div>
    );
}
