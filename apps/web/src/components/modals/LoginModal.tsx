import { useState, type SubmitEvent } from "react";
import ReactDOM from "react-dom";
import { API_URL } from "../config/api";
import { useNavigate } from "react-router";
import axios from "axios";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

type AuthMode = "login" | "signup";
type NoticeType = "error" | "success" | "info";

type Notice = {
  type: NoticeType;
  message: string;
};

type User = {
  fullName?: string;
  email?: string;
  password?: string;
};

function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const navigate = useNavigate();
  const [_, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!isOpen) return null;

  const isLogin = mode === "login";

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isLogin && password !== confirmPassword) {
      setNotice({
        type: "error",
        message: "Passwords do not match.",
      });
      return;
    }

    const url = isLogin ? `${API_URL}/api/login` : `${API_URL}/api/signup`;

    const body = isLogin
      ? { email, password }
      : { username: fullName, email, password };

    try {
      const response = await axios.post(url, body);
      const data = response.data;

      if (isLogin) {
        localStorage.setItem("token", data.token);
        onLoginSuccess();
        setNotice(null);
        closeModal();
        navigate("/homepage");
      } else {
        setUser(body);
        setNotice({
          type: "success",
          message: "Account created successfully. Please log in.",
        });
        setPassword("");
        setConfirmPassword("");
        setShowConfirmPassword(false);
        setMode("login");
      }
    } catch (error) {
      console.error("Error during request:", error);

      // Axios throws for status codes outside 2xx (e.g., 400, 401, 500)
      if (axios.isAxiosError(error) && error.response) {
        if (isLogin) {
          setNotice({
            type: "error",
            message: "Email or Password incorrect",
          });
        } else {
          setNotice({
            type: "error",
            message: "Email already exists. Please use a new one.",
          });
        }
      } else {
        setNotice({
          type: "error",
          message: "Something went wrong. Please try again.",
        });
      }
    }
  };

  const closeModal = () => {
    setMode("login");
    setShowLoginPassword(false);
    setShowSignupPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const PasswordToggle = ({
    isVisible,
    onClick,
  }: {
    isVisible: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        onClick();
      }}
      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
      aria-label={isVisible ? "Hide password" : "Show password"}
    >
      {isVisible ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path
            d="M3 3l18 18"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M10.58 10.58A2 2 0 0012 15a2 2 0 001.42-.58"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.88 5.09A10.96 10.96 0 0112 5c5.5 0 9.5 4 10.5 7-.31.93-.8 1.94-1.46 2.96"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.23 6.23C3.86 7.72 2.15 9.95 1.5 12c1 3 5 7 10.5 7 1.01 0 1.98-.09 2.9-.27"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path
            d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 15a3 3 0 100-6 3 3 0 000 6Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-md"
      onClick={closeModal}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-4xl border border-white/10 bg-[#0b1020] text-white shadow-[0_30px_120px_rgba(15,23,42,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative bg-slate-50 px-5 py-5 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-7 sm:py-7">
          <button
            onClick={closeModal}
            className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
            aria-label="Close dialog"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="pr-10">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400">
              {mode === "login" ? "Welcome back" : "Welcome"}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              {mode === "login" ? "Sign in to NEXUS" : "Create your account"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="yourname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-400"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  type={
                    mode === "login"
                      ? showLoginPassword
                        ? "text"
                        : "password"
                      : showSignupPassword
                        ? "text"
                        : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-14 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-400"
                />
                {mode === "login" ? (
                  <PasswordToggle
                    isVisible={showLoginPassword}
                    onClick={() => setShowLoginPassword((visible) => !visible)}
                  />
                ) : (
                  <PasswordToggle
                    isVisible={showSignupPassword}
                    onClick={() => setShowSignupPassword((visible) => !visible)}
                  />
                )}
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-14 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-400"
                  />
                  <PasswordToggle
                    isVisible={showConfirmPassword}
                    onClick={() =>
                      setShowConfirmPassword((visible) => !visible)
                    }
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="mt-2 w-full rounded-2xl bg-linear-to-r from-violet-700 via-fuchsia-600 to-purple-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/30"
            >
              {mode === "login" ? "Sign In" : "Create Account"}
            </button>

            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              {mode === "login"
                ? "Need an account? "
                : "Already have an account? "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {mode === "login" ? "Sign up" : "Log in"}
              </button>
            </p>
            {notice && (
              <div
                className={`mt-6 rounded-xl border px-4 py-3 text-sm font-medium ${
                  notice.type === "error"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : notice.type === "success"
                      ? "border-green-300 bg-green-50 text-green-700"
                      : "border-sky-300 bg-sky-50 text-sky-700"
                }`}
              >
                {notice.message}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default LoginModal;
