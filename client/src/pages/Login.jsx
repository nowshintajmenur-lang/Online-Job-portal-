import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../Context/AuthContext";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { apiFetch } from "../api";
import { signOut } from "firebase/auth";

const HOME = {
  seeker: "/dashboard",
  employer: "/employer",
  admin: "/admin",
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("seeker");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setError("Wrong email or password.");
      return;
    }

    try {
      // Ask our server who this user really is (the role comes from the database)
      const { user } = await apiFetch("/api/auth/sync", {
        method: "POST",
        body: { name: name.trim(), role },
      });
      if (user.role !== role) {
        await signOut(auth);
        setError(`This is a ${user.role} account. Choose the right tab above.`);
        return;
      }
      login({ name: user.name, email: user.email, role: user.role });
      navigate(HOME[user.role]);
    } catch (err) {
      await signOut(auth);
      setError(err.message);
    }
  };

  const roleBtn = (value, label) => (
    <button
      type="button"
      onClick={() => {
        setRole(value);
        setError("");
      }}
      className={
        "rounded-md py-2 text-sm font-medium transition-all " +
        (role === value
          ? "bg-white text-ink shadow-sm"
          : "text-slate-500 hover:text-ink")
      }
    >
      {label}
    </button>
  );

  const inputClass =
    "mt-1 w-full rounded-lg border border-white/70 bg-white/60 px-3 py-2 text-sm text-ink placeholder:text-slate-400 transition-all focus:border-accent focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-accent/20";

  return (
    <main className="relative isolate min-h-[calc(100vh-73px)] overflow-hidden bg-gradient-to-br from-mist via-blue-50 to-indigo-100">
      {/* Background blobs (what the glass blurs) */}
      <div className="animate-float pointer-events-none absolute top-16 left-[8%] -z-10 h-80 w-80 rounded-full bg-accent/60 blur-3xl" />
      <div className="animate-float-slow pointer-events-none absolute bottom-10 left-[22%] -z-10 h-72 w-72 rounded-full bg-cyan-400/50 blur-3xl" />
      <div className="animate-float pointer-events-none absolute top-1/4 left-[30%] -z-10 h-64 w-64 rounded-full bg-fuchsia-400/30 blur-3xl" />
      <div className="animate-float-slow pointer-events-none absolute top-1/3 right-[5%] -z-10 h-[26rem] w-[26rem] rounded-full bg-indigo-400/40 blur-3xl" />

      <div className="mx-auto grid max-w-5xl items-stretch gap-10 px-6 py-16 md:grid-cols-2">
        {/* Branding panel (live dark glass) */}
        <div className="relative hidden h-full flex-col justify-center overflow-hidden rounded-3xl border border-white/25 bg-navy/70 p-10 text-white shadow-2xl shadow-accent/20 backdrop-blur-2xl backdrop-saturate-150 md:flex">
          <div className="animate-float pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-accent/60 blur-3xl" />
          <div className="animate-float-slow pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-cyan-400/40 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 via-transparent to-transparent" />
          <div className="animate-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          <div className="relative">
            <span className="font-display text-2xl font-semibold">
              Job<span className="text-blue-300">Hub</span>
            </span>
            <h2 className="mt-6 font-display text-2xl font-semibold leading-snug">
              Welcome back. Your next opportunity is one search away.
            </h2>
            <p className="mt-4 text-sm text-slate-200">
              Log in to pick up where you left off — saved jobs, applications,
              or your open postings.
            </p>

            <div className="mt-10 space-y-3">
              <div className="animate-bob flex items-center justify-between rounded-xl border border-white/30 bg-white/15 px-4 py-3 shadow-lg backdrop-blur-lg transition-colors hover:bg-white/25">
                <div>
                  <p className="text-sm font-medium">Senior Frontend Engineer</p>
                  <p className="text-xs text-slate-200">Remote · 46 applicants</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
                  </span>
                  Open
                </span>
              </div>
              <div
                className="animate-bob flex items-center justify-between rounded-xl border border-white/30 bg-white/15 px-4 py-3 shadow-lg backdrop-blur-lg transition-colors hover:bg-white/25"
                style={{ animationDelay: "1.4s" }}
              >
                <div>
                  <p className="text-sm font-medium">Product Designer</p>
                  <p className="text-xs text-slate-200">Chattogram · 28 applicants</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
                  </span>
                  Open
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form panel (frosted glass) */}
        <div className="flex h-full flex-col justify-center rounded-3xl border border-white/60 bg-white/40 p-8 shadow-xl shadow-accent/10 backdrop-blur-xl transition-shadow duration-300 hover:shadow-2xl hover:shadow-accent/20">
          <h1 className="font-display text-2xl font-semibold text-ink">
            Log in to JobHub
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Enter your details to access your account.
          </p>

          {/* Role toggle */}
          <div className="mt-6 grid grid-cols-3 gap-2 rounded-lg border border-white/70 bg-white/50 p-1 backdrop-blur-md">
            {roleBtn("seeker", "Job Seeker")}
            {roleBtn("employer", "Employer")}
            {roleBtn("admin", "Admin")}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {role !== "admin" && (
              <div>
                <label className="text-sm font-medium text-ink">
                  {role === "seeker" ? "Full name" : "Company name"}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === "seeker" ? "Jane Doe" : "Acme Inc."}
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-ink">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === "admin" ? "admin@jobhub.com" : "you@example.com"}
                required={role === "admin"}
                className={inputClass}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-ink">Password</label>
                <a href="#" className="text-xs font-medium text-accent hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={role === "admin"}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-white/70 bg-white/60 px-3 py-2 pr-10 text-sm text-ink placeholder:text-slate-400 transition-all focus:border-accent focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" className="rounded border-slate-300 accent-accent" />
              Keep me signed in
            </label>

            <button
              type="submit"
              className="w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-accent hover:shadow-lg active:translate-y-0"
            >
              Log in
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-accent hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}