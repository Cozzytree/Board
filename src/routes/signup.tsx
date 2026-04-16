import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React from "react";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Background } from "../components/Background";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/signup")({
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
        username,
      });

      if (result.error) {
        setError(result.error.message || "Failed to create account");
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
    <Background variant="sunset">
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-md w-full">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold text-[#cdd6f4]">Create an account</h1>
          <p className="text-[#6c7086] text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-[#f5c2e7] hover:underline">
              Sign in
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
          {/* Username */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-[#bac2de]" htmlFor="username">
              Username
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#45475a]" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#11111b] border border-[#313244]
                  text-sm text-[#cdd6f4] placeholder-[#45475a]
                  focus:outline-none focus:border-[#f5c2e7]/50 focus:ring-1 focus:ring-[#f5c2e7]/20
                  transition-all"
              />
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-[#bac2de]" htmlFor="name">
              Display Name
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#45475a]" />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#11111b] border border-[#313244]
                  text-sm text-[#cdd6f4] placeholder-[#45475a]
                  focus:outline-none focus:border-[#f5c2e7]/50 focus:ring-1 focus:ring-[#f5c2e7]/20
                  transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-[#bac2de]" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#45475a]" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#11111b] border border-[#313244]
                  text-sm text-[#cdd6f4] placeholder-[#45475a]
                  focus:outline-none focus:border-[#f5c2e7]/50 focus:ring-1 focus:ring-[#f5c2e7]/20
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
                placeholder="Create a password"
                required
                minLength={8}
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#11111b] border border-[#313244]
                  text-sm text-[#cdd6f4] placeholder-[#45475a]
                  focus:outline-none focus:border-[#f5c2e7]/50 focus:ring-1 focus:ring-[#f5c2e7]/20
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

          {/* Confirm Password */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-[#bac2de]" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#45475a]" />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#11111b] border border-[#313244]
                  text-sm text-[#cdd6f4] placeholder-[#45475a]
                  focus:outline-none focus:border-[#f5c2e7]/50 focus:ring-1 focus:ring-[#f5c2e7]/20
                  transition-all"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full py-3 rounded-xl bg-[#f5c2e7] text-[#1e1e2e] font-medium
              hover:bg-[#eba0ac] disabled:opacity-50 disabled:cursor-not-allowed
              transition-all shadow-lg shadow-[#f5c2e7]/20">
            {isLoading ? "Creating account..." : "Create account"}
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

export default Signup;
