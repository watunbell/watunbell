"use client";

import { useEffect, useState } from "react";
import { Loader2, Package } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ALLOWED_DOMAIN } from "@/lib/constants";

export function SignInScreen() {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NextAuth redirects back with ?error=… when the domain check rejects a user.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "AccessDenied") {
      setError(`Access is restricted to @${ALLOWED_DOMAIN} accounts.`);
    } else if (err) {
      setError("Sign-in failed. Please try again.");
    }
  }, []);

  function handleSignIn() {
    setBusy(true);
    signIn();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-white">
            <Package className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">
            Department Inventory
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in with your university Google account to continue.
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSignIn}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
          Sign in with Google
        </button>

        <p className="mt-4 text-center text-xs text-gray-400">
          Access restricted to{" "}
          <span className="font-medium text-gray-500">@{ALLOWED_DOMAIN}</span>{" "}
          accounts.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
