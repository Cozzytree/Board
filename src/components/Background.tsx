import React from "react";

interface BackgroundProps {
  children: React.ReactNode;
  variant?: "default" | "warm" | "cool" | "sunset";
}

const backgrounds = {
  default: (
    <>
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#7c3aed]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#06b6d4]/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-[#f43f5e]/6 rounded-full blur-[100px] pointer-events-none" />
    </>
  ),
  warm: (
    <>
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#f59e0b]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#ef4444]/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[60%] w-[350px] h-[350px] bg-[#fbbf24]/6 rounded-full blur-[100px] pointer-events-none" />
    </>
  ),
  cool: (
    <>
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#0ea5e9]/12 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[450px] h-[450px] bg-[#6366f1]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[50%] right-[30%] w-[280px] h-[280px] bg-[#14b8a6]/8 rounded-full blur-[100px] pointer-events-none" />
    </>
  ),
  sunset: (
    <>
      <div className="absolute top-[-15%] left-[20%] w-[550px] h-[550px] bg-[#ec4899]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[480px] h-[480px] bg-[#8b5cf6]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] left-[10%] w-[320px] h-[320px] bg-[#f97316]/8 rounded-full blur-[100px] pointer-events-none" />
    </>
  ),
};

export function Background({ children, variant = "default" }: BackgroundProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#cdd6f4] flex flex-col items-center justify-center relative overflow-hidden">
      {backgrounds[variant]}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {children}
    </div>
  );
}
