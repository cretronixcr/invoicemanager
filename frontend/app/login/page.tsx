"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { LogIn, Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    undefined
  );

  return (
    <div className="min-h-screen w-full bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logodanibro.svg"
            alt="Dani Brothers"
            className="h-12 w-auto mx-auto object-contain"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <p className="mt-3 text-[11px] text-neutral-400 font-medium tracking-[0.18em] uppercase">
            Invoice Management
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl shadow-black/40 p-6 sm:p-7">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-neutral-900 tracking-tight">
                Sign in
              </h1>
              <p className="text-[11px] text-neutral-500">
                Access the billing dashboard
              </p>
            </div>
          </div>

          <form action={formAction} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-neutral-700 mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  defaultValue={state?.email ?? ""}
                  placeholder="admin@danibrothers.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-neutral-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>

            {state?.error && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition-all active:translate-y-px disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>{pending ? "Signing in..." : "Sign in"}</span>
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-neutral-600 mt-5">
          DANI BROTHERS • Authorized personnel only
        </p>
      </div>
    </div>
  );
}
