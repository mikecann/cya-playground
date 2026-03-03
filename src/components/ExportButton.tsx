import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { useToast } from "./Toast";

export function ExportButton({ projectId }: { projectId: Id<"projects"> }) {
  const user = useQuery(api.users.currentUser);
  const requestExport = useMutation(api.exports.requestExport);
  const { addToast } = useToast();
  const [exporting, setExporting] = useState(false);

  return (
    <button
      disabled={exporting || !user?.email}
      onClick={() => {
        if (!user?.email) return;
        setExporting(true);
        requestExport({ projectId, email: user.email })
          .then(() => addToast("Export queued - check your email shortly."))
          .catch((err: Error) => addToast(err.message))
          .finally(() => setExporting(false));
      }}
      className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm transition-colors disabled:opacity-50"
    >
      {exporting ? "Exporting..." : "Export"}
    </button>
  );
}
