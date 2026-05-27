"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { countUniqueGuests, formatAllGuestNames, type GuestName } from "@/lib/rsvp";

type RsvpRow = {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  attending: boolean;
  guestCount: number;
  additionalGuests: GuestName[];
  mealPreference: string | null;
  dietaryRestrictions: string | null;
  message: string | null;
};

export function AdminRsvpTable({ rsvps }: { rsvps: RsvpRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function sendEmail(rsvp: RsvpRow) {
    const params = new URLSearchParams({
      mode: "single",
      email: rsvp.email,
      firstName: rsvp.firstName,
      lastName: rsvp.lastName,
      rsvpId: rsvp.id,
    });
    router.push(`/admin/email?${params.toString()}`);
  }

  async function removeRsvp(rsvp: RsvpRow) {
    const guestNames = formatAllGuestNames(
      { firstName: rsvp.firstName, lastName: rsvp.lastName },
      rsvp.additionalGuests
    );
    const confirmed = window.confirm(
      `Remove this RSVP from ${guestNames}? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(rsvp.id);
    setError("");

    try {
      const res = await fetch(`/api/admin/rsvps/${rsvp.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to remove RSVP.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove RSVP.");
    } finally {
      setDeletingId(null);
    }
  }

  const totalGuests = countUniqueGuests(rsvps);

  return (
    <>
      <div className="panel admin-toolbar">
        <p style={{ margin: 0 }}>
          <strong>{rsvps.length}</strong> responses ·{" "}
          <strong>{totalGuests}</strong> unique guests
        </p>
      </div>

      {error ? <div className="notice notice-error">{error}</div> : null}

      {rsvps.length === 0 ? (
        <p className="page-lead">No RSVPs yet.</p>
      ) : (
        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Guests</th>
                <th>Email</th>
                <th>Count</th>
                <th>Message</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rsvps.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td>
                    {formatAllGuestNames(
                      { firstName: r.firstName, lastName: r.lastName },
                      r.additionalGuests
                    )}
                  </td>
                  <td>{r.email}</td>
                  <td>{r.guestCount}</td>
                  <td>{r.message || "—"}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="btn btn-ghost admin-remove-btn"
                        onClick={() => sendEmail(r)}
                      >
                        Email
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost admin-remove-btn"
                        onClick={() => removeRsvp(r)}
                        disabled={deletingId === r.id}
                      >
                        {deletingId === r.id ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
