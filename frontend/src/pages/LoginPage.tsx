import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
} from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import "./LoginPage.css";

export default function LoginPage({ onLogin }: { onLogin: (user: { phoneNumber: string | null }) => void }) {
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [confirm, setConfirm] = useState<ConfirmationResult>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const verifierRef = useRef<RecaptchaVerifier | null>(null);

    useEffect(() => {
        verifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
        return () => {
            verifierRef.current?.clear();
            verifierRef.current = null;
        };
    }, []);

    async function verifyOTP() {
        setLoading(true);
        setError("");
        try {
            const result = await confirm!.confirm(code);
            onLogin(result.user);
            navigate("/senior");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    async function sendOTP() {
        setLoading(true);
        setError("");
        try {
            const formatted = phone.startsWith("+") ? phone : `+1${phone}`;
            const result = await signInWithPhoneNumber(auth, formatted, verifierRef.current!);
            setConfirm(result);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to send code. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-wrapper">
            <h1 className="login-title">Comet</h1>
            <div id="recaptcha-container" />
            {error && <p style={{ color: "red", marginBottom: "8px" }}>{error}</p>}
            {!confirm ? (
                <>
                    <p className="login-sub">Enter your phone number</p>
                    <input className="login-input" type="tel"
                        placeholder="+1 555 000 0000"
                        value={phone}
                        onChange={e => setPhone(e.target.value)} />
                    <button className="login-btn" onClick={sendOTP}
                        disabled={loading}>
                        {loading ? "Sending..." : "Send Code"}
                    </button>
                </>
            ) : (
                <>
                    <p className="login-sub">Enter the 6-digit code</p>
                    <input className="login-input" type="number"
                        placeholder="123456"
                        value={code}
                        onChange={e => setCode(e.target.value)} />
                    <button className="login-btn" onClick={verifyOTP}
                        disabled={loading}>
                        {loading ? "Verifying..." : "Verify"}
                    </button>
                </>
            )}
        </div>
    );
}
