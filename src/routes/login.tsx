import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React from "react";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { Background } from "../components/Background";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const isEmail = identifier.includes("@");
      let result;

      if (isEmail) {
        result = await authClient.signIn.email({
          email: identifier,
          password,
        });
      } else {
        result = await authClient.signIn.username({
          username: identifier,
          password,
        });
      }

      if (result.error) {
        setError(result.error.message || "Invalid credentials");
      } else {
        navigate({ to: "/" });
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Background variant="cool">
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-md w-full">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold text-[#cdd6f4]">Welcome back</h1>
          <p className="text-[#6c7086] text-sm">
            Don't have an account?{" "}
            <Link to="/signup" className="text-[#89b4fa] hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full p-3 rounded-lg bg-[#f38ba8]/10 border border-[#f38ba8]/30 text-[#f38ba8] text-sm text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col gap-4 p-6 rounded-2xl
            bg-gradient-to-br from-[#1e1e2e] to-[#181825]
            border border-[#313244]">
          {/* Email or Username */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-[#bac2de]" htmlFor="identifier">
              Email or Username
            </label>
            <div className="relative">
              {identifier.includes("@") ? (
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#45475a]"
                />
              ) : (
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#45475a]"
                />
              )}
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or username"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#11111b] border border-[#313244]
                  text-sm text-[#cdd6f4] placeholder-[#45475a]
                  focus:outline-none focus:border-[#89b4fa]/50 focus:ring-1 focus:ring-[#89b4fa]/20
                  transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-[#bac2de]" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#45475a]" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#11111b] border border-[#313244]
                  text-sm text-[#cdd6f4] placeholder-[#45475a]
                  focus:outline-none focus:border-[#89b4fa]/50 focus:ring-1 focus:ring-[#89b4fa]/20
                  transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#45475a] hover:text-[#bac2de] transition-colors">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !identifier.trim() || !password}
            className="mt-2 w-full py-3 rounded-xl bg-[#89b4fa] text-[#1e1e2e] font-medium
              hover:bg-[#b4befe] disabled:opacity-50 disabled:cursor-not-allowed
              transition-all shadow-lg shadow-[#89b4fa]/20">
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Back to home */}
        <Link to="/" className="text-sm text-[#6c7086] hover:text-[#cdd6f4] transition-colors">
          ← Back to home
        </Link>
      </div>
    </Background>
  );
}

export default Login;
