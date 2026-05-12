"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Roboto } from "next/font/google";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  MapPin,
  Heart,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { ThemeToggle } from "../../components/ThemeToggle";

const roboto = Roboto({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "700", "900"],
});

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // C: Không crash, bắt lỗi cẩn thận
  useEffect(() => {
    // Nếu đã đăng nhập, tự động chuyển về trang đích
    const token = localStorage.getItem("access_token");
    if (token) {
      router.push(redirectPath);
    }
  }, [router, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // A/B: Validate theo yêu cầu
    if (username.length < 3) {
      setErrorMsg("Tên đăng nhập phải có ít nhất 3 ký tự.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }

    setIsLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
      const endpoint = mode === "signin" ? "/api/v1/users/sign_in" : "/api/v1/users/sign_up";

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        // C: Hiển thị thông báo lỗi đúng chuẩn
        if (res.status === 409 && mode === "signup") {
          throw new Error("Tên người dùng đã tồn tại.");
        } else if (res.status === 401 && mode === "signin") {
          throw new Error("Sai tên đăng nhập hoặc mật khẩu.");
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Lỗi server (${res.status})`);
        }
      }

      const data = await res.json();

      // A/B: Thành công -> Lưu token
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("username", data.username || username);

      // Chuyển hướng: Nếu là Đăng ký mới -> Ép buộc sang trang Onboarding để làm khảo sát
      if (mode === "signup") {
        router.push("/onboarding");
      } else {
        router.push(redirectPath);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-[#F7F8FA] dark:bg-[#0A0D14] p-4 sm:p-8 ${roboto.className}`}>
      {/* Outer wrapper: flex to separate the two cards with a gap */}
      <div className="w-full max-w-[1200px] flex items-center gap-6 lg:gap-8">

        {/* LEFT SIDE */}
        <div className="hidden lg:flex flex-[1.3] h-[800px] relative bg-black flex-col justify-between p-12 text-white rounded-[2rem] overflow-hidden shadow-2xl">
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1200&auto=format&fit=crop')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-white text-xl">🍜</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">Wanderbite</span>
          </div>

          <div className="relative z-10 max-w-md">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-sm font-medium mb-6 backdrop-blur-md">
              <Sparkles className="w-4 h-4" />
              AI-Powered Food Discovery
            </div>
            <h1 className="text-5xl font-bold leading-[1.15] mb-6">
              Discover your perfect culinary vibe <span className="text-orange-500">powered by AI.</span>
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed">
              Smart recommendations, real-time locations, and flavors that match your mood.
            </p>
          </div>

          <div className="relative z-10 flex gap-8">
            <div>
              <div className="w-10 h-10 rounded-full border border-orange-500/30 flex items-center justify-center mb-3 bg-black/40 backdrop-blur-md">
                <Sparkles className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="font-semibold text-sm mb-1">AI Recommendations</h3>
              <p className="text-xs text-gray-400">Personalized just for you</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full border border-orange-500/30 flex items-center justify-center mb-3 bg-black/40 backdrop-blur-md">
                <MapPin className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Nearby & Live</h3>
              <p className="text-xs text-gray-400">Real-time GPS results</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full border border-orange-500/30 flex items-center justify-center mb-3 bg-black/40 backdrop-blur-md">
                <Heart className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Vibes & Moods</h3>
              <p className="text-xs text-gray-400">Match your every mood</p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE (Thẻ form: bỏ fix height để tự động co giãn theo nội dung) */}
        <div className="w-full lg:flex-1 p-8 sm:p-12 flex flex-col relative bg-white dark:bg-[#121622] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800">

          <div className="absolute top-6 right-8 flex items-center gap-4 z-20">
            <ThemeToggle />
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-[360px] mx-auto w-full mt-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {mode === "signin" ? "Welcome back !" : "Join Wanderbite"}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-[15px]">
                {mode === "signin"
                  ? "Sign in to continue your culinary journey."
                  : "Create an account to start exploring."}
              </p>
            </div>

            <div className="flex p-1.5 bg-gray-100 dark:bg-gray-800/50 rounded-xl mb-8">
              <button
                type="button"
                onClick={() => { setMode("signin"); setErrorMsg(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === "signin"
                  ? "bg-white dark:bg-[#1F2433] text-orange-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                <User className="w-4 h-4" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setErrorMsg(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === "signup"
                  ? "bg-white dark:bg-[#1F2433] text-orange-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                <User className="w-4 h-4" />
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {errorMsg && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-500/20">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="pt-0.5">{errorMsg}</p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full bg-white dark:bg-[#1A1F2B] border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-11 pr-4 text-[15px] text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-white dark:bg-[#1A1F2B] border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-11 pr-11 text-[15px] text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {mode === "signin" && (
                <div className="flex items-center justify-between mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded text-orange-500 border-gray-300 focus:ring-orange-500" />
                    <span className="text-[13px] font-medium text-gray-600 dark:text-gray-400">Remember me</span>
                  </label>
                  <a href="#" className="text-[13px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline">
                    Forgot password?
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl py-3.5 mt-2 font-semibold shadow-md shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === "signin" ? "Sign In" : "Sign Up"}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 relative flex items-center justify-center">
              <div className="absolute inset-x-0 h-px bg-gray-200 dark:bg-gray-800" />
              <span className="relative bg-white dark:bg-[#121622] px-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                OR
              </span>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <button 
                onClick={() => alert("Tính năng Google Auth đang được phát triển!")}
                className="flex items-center justify-center gap-3 w-full py-3 bg-white dark:bg-[#1A1F2B] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#1F2433] active:scale-[0.98] rounded-xl text-[14px] font-semibold text-gray-700 dark:text-gray-300 transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
            </div>

            <p className="mt-8 text-center text-[14px] text-gray-500 dark:text-gray-400">
              {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErrorMsg(""); }}
                className="font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                {mode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
