"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { SerializedHousehold } from "@/lib/households";

type Summary = {
  households: number;
  responded: number;
  awaitingHouseholds: number;
  attending: number;
  declined: number;
  awaitingGuests: number;
};

type Filter = "all" | "responded" | "awaiting";

function names(guests: SerializedHousehold["guests"]) {
  return guests.map((g) => `${g.firstName} ${g.lastName}`).join(", ") || "—";
}

export function AdminRsvpTable({
  households,
  summary,
}: {
  households: SerializedHousehold[];
  summary: Summary;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    const list =
      filter === "responded"
        ? households.filter((h) => h.respondedAt)
        : filter === "awaiting"
          ? households.filter((h) => !h.respondedAt)
          : households;
    // Most recent responses first, then everyone still awaiting.
    return [...list].sort((a, b) => {
      if (a.respondedAt && b.respondedAt) return b.respondedAt.localeCompare(a.respondedAt);
      if (a.respondedAt) return -1;
      if (b.respondedAt) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [households, filter]);

  async function resetResponse(h: SerializedHousehold) {
    if (
      !window.confirm(
        `Clear the RSVP from ${h.name}? They'll show as awaiting and can respond again.`
      )
    ) {
      return;
    }
    setBusyId(h.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/households/${h.id}/response`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to clear RSVP.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="admin-stats">
        <div className="panel admin-stat">
          <span className="admin-stat-value">{summary.attending}</span>
          <span className="admin-stat-label">Attending</span>
        </div>
        <div className="panel admin-stat">
          <span className="admin-stat-value">{summary.declined}</span>
          <span className="admin-stat-label">Declined</span>
        </div>
        <div className="panel admin-stat">
          <span className="admin-stat-value">{summary.awaitingGuests}</span>
          <span className="admin-stat-label">Awaiting reply</span>
        </div>
        <div className="panel admin-stat">
          <span className="admin-stat-value">
            {summary.responded}/{summary.households}
          </span>
          <span className="admin-stat-label">Households responded</span>
        </div>
      </div>

      <div className="panel admin-toolbar">
        <div className="radio-row" role="radiogroup" aria-label="Show">
          {(
            [
              ["all", "All"],
              ["responded", "Responded"],
              ["awaiting", "Awaiting"],
            ] as const
          ).map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="rsvpFilter"
                checked={filter === value}
                onChange={() => setFilter(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {error ? <div className="notice notice-error">{error}</div> : null}

      {visible.length === 0 ? (
        <p className="page-lead">
          {households.length === 0
            ? "No households yet. Add guests on the Guest list page."
            : "Nothing to show."}
        </p>
      ) : (
        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Household</th>
                <th>Attending</th>
                <th>Declined</th>
                <th>Plus-ones</th>
                <th>Message</th>
                <th>Responded</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((h) => {
                const invited = h.guests.filter((g) => !g.isPlusOne);
                const plusOnes = h.guests.filter((g) => g.isPlusOne);
                return (
                  <tr key={h.id}>
                    <td>{h.name}</td>
                    {h.respondedAt ? (
                      <>
                        <td>{names(invited.filter((g) => g.attending))}</td>
                        <td>{names(invited.filter((g) => g.attending === false))}</td>
                        <td>
                          {plusOnes.length > 0
                            ? names(plusOnes)
                            : h.plusOnes > 0
                              ? `None (${h.plusOnes} allowed)`
                              : "—"}
                        </td>
                        <td>{h.message || "—"}</td>
                        <td>{new Date(h.respondedAt).toLocaleString()}</td>
                      </>
                    ) : (
                      <>
                        <td className="admin-cell-empty">—</td>
                        <td className="admin-cell-empty">—</td>
                        <td className="admin-cell-empty">
                          {h.plusOnes > 0 ? `${h.plusOnes} allowed` : "—"}
                        </td>
                        <td className="admin-cell-empty">—</td>
                        <td>
                          <span className="status-badge status-awaiting">Awaiting</span>
                        </td>
                      </>
                    )}
                    <td>
                      {h.respondedAt ? (
                        <button
                          type="button"
                          className="btn btn-ghost admin-remove-btn"
                          onClick={() => resetResponse(h)}
                          disabled={busyId === h.id}
                        >
                          {busyId === h.id ? "Clearing…" : "Clear RSVP"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
