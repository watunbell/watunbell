import { AlertTriangle } from "lucide-react";

/** Shown when Firebase env vars are missing, so the app degrades gracefully. */
export function ConfigNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="space-y-1">
        <p className="font-semibold">Firebase not connected</p>
        <p>{message}</p>
        <p className="text-amber-700">
          See <code className="rounded bg-amber-100 px-1">.env.example</code> and{" "}
          <code className="rounded bg-amber-100 px-1">docs/FIRESTORE_SCHEMA.md</code>{" "}
          for setup steps.
        </p>
      </div>
    </div>
  );
}
