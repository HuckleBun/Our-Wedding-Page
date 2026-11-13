"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import type { SerializedHousehold } from "@/lib/households";

type GuestDraft = { key: string; firstName: string; lastName: string };

type FormState = {
  name: string;
  email: string;
  plusOnes: number;
  notes: string;
  guests: GuestDraft[];
};

const MAX_PLUS_ONES = 5;

function newKey() {
  return Math.random().toString(36).slice(2);
}

function emptyForm(): FormState {
  return {
    name: "",
    email: "",
    plusOnes: 0,
    notes: "",
    guests: [{ key: newKey(), firstName: "", lastName: "" }],
  };
}

const STATUS_LABEL: Record<SerializedHousehold["status"], string> = {
  attending: "Attending",
  declined: "Declined",
  awaiting: "Awaiting",
};

export function AdminGuestList({
  households,
  invitePageUrl,
}: {
  households: SerializedHousehold[];
  invitePageUrl: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState(false);

  const totals = useMemo(() => {
    let guests = 0;
    let plusOnes = 0;
    let noEmail = 0;
    for (const h of households) {
      guests += h.guests.filter((g) => !g.isPlusOne).length;
      plusOnes += h.plusOnes;
      if (!h.email) noEmail += 1;
    }
    return { guests, plusOnes, noEmail };
  }, [households]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return households;
    return households.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.email ?? "").includes(q) ||
        h.guests.some((g) => `${g.firstName} ${g.lastName}`.toLowerCase().includes(q))
    );
  }, [households, filter]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setError("");
  }

  function openEdit(h: SerializedHousehold) {
    setEditingId(h.id);
    setForm({
      name: h.name,
      email: h.email ?? "",
      plusOnes: h.plusOnes,
      notes: h.notes ?? "",
      guests: h.guests
        .filter((g) => !g.isPlusOne)
        .map((g) => ({ key: g.id, firstName: g.firstName, lastName: g.lastName })),
    });
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateGuest(key: string, field: "firstName" | "lastName", value: string) {
    setForm({
      ...form,
      guests: form.guests.map((g) => (g.key === key ? { ...g, [field]: value } : g)),
    });
  }

  async function request(url: string, init: RequestInit, fallback: string) {
    const res = await fetch(url, init);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || fallback);
    return json;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy("save");
    setError("");
    setMessage("");

    try {
      await request(
        editingId ? `/api/admin/households/${editingId}` : "/api/admin/households",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim() || null,
            plusOnes: form.plusOnes,
            notes: form.notes.trim() || null,
            guests: form.guests.map((g) => ({
              firstName: g.firstName.trim(),
              lastName: g.lastName.trim(),
            })),
          }),
        },
        "Failed to save household."
      );
      setShowForm(false);
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function removeHousehold(h: SerializedHousehold) {
    if (!window.confirm(`Remove ${h.name} and their RSVP? This cannot be undone.`)) return;
    setBusy(h.id);
    setError("");
    try {
      await request(
        `/api/admin/households/${h.id}`,
        { method: "DELETE" },
        "Failed to remove household."
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function importFromJson() {
    if (
      !window.confirm(
        "Import households from src/data/guest-list.json? Households that match an existing guest's name are updated; nobody is removed."
      )
    ) {
      return;
    }
    setBusy("import");
    setError("");
    setMessage("");
    try {
      const json = await request(
        "/api/admin/households/import",
        { method: "POST" },
        "Import failed."
      );
      setMessage(
        `Import complete: ${json.created} created, ${json.updated} updated, ${json.skipped} skipped.`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  function sendEmail(h: SerializedHousehold) {
    const first = h.guests.find((g) => !g.isPlusOne);
    const params = new URLSearchParams({
      mode: "single",
      email: h.email ?? "",
      firstName: first?.firstName ?? "",
      lastName: first?.lastName ?? "",
      householdId: h.id,
    });
    router.push(`/admin/email?${params.toString()}`);
  }

  async function copyInviteLink() {
    if (!invitePageUrl) return;
    try {
      await navigator.clipboard.writeText(invitePageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", invitePageUrl);
    }
  }

  return (
    <>
      <div className="panel admin-invite-link">
        <h2>Private save-the-date page</h2>
        {invitePageUrl ? (
          <>
            <p>
              Share this link by text, email, or a QR code. It isn&apos;t linked anywhere
              on the site.
            </p>
            <div className="admin-invite-link-row">
              <a href={invitePageUrl} target="_blank" rel="noopener noreferrer">
                {invitePageUrl}
              </a>
              <button type="button" className="btn btn-ghost" onClick={copyInviteLink}>
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </>
        ) : (
          <p>
            Turned off. Set <code>INVITE_PAGE_TOKEN</code> in your <code>.env</code> to a
            long random value (12+ characters) to enable it.
          </p>
        )}
      </div>

      <div className="panel admin-toolbar">
        <p style={{ margin: 0 }}>
          <strong>{households.length}</strong> households ·{" "}
          <strong>{totals.guests}</strong> invited guests ·{" "}
          <strong>{totals.plusOnes}</strong> plus-ones allowed
          {totals.noEmail > 0 ? (
            <>
              {" "}
              · <strong>{totals.noEmail}</strong> without email
            </>
          ) : null}
        </p>
        <div className="admin-toolbar-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Add household
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={importFromJson}
            disabled={busy === "import"}
          >
            {busy === "import" ? "Importing…" : "Import from JSON"}
          </button>
        </div>
      </div>

      {message ? <div className="notice notice-success">{message}</div> : null}
      {error ? <div className="notice notice-error">{error}</div> : null}

      {showForm ? (
        <form className="form panel admin-household-form" onSubmit={onSubmit}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {editingId ? "Edit household" : "Add household"}
          </h2>

          {form.guests.map((guest, index) => (
            <div key={guest.key} className="admin-guest-row">
              <div className="field">
                <label htmlFor={`gFirst_${guest.key}`}>
                  {index === 0 ? "Guest first name" : `Guest ${index + 1} first name`}
                </label>
                <input
                  id={`gFirst_${guest.key}`}
                  value={guest.firstName}
                  onChange={(e) => updateGuest(guest.key, "firstName", e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor={`gLast_${guest.key}`}>Last name</label>
                <input
                  id={`gLast_${guest.key}`}
                  value={guest.lastName}
                  onChange={(e) => updateGuest(guest.key, "lastName", e.target.value)}
                  required
                />
              </div>
              <button
                type="button"
                className="btn btn-ghost admin-remove-btn"
                onClick={() =>
                  setForm({ ...form, guests: form.guests.filter((g) => g.key !== guest.key) })
                }
                disabled={form.guests.length === 1}
                aria-label={`Remove guest ${index + 1}`}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost add-guest-btn"
            onClick={() =>
              setForm({
                ...form,
                guests: [...form.guests, { key: newKey(), firstName: "", lastName: "" }],
              })
            }
          >
            Add person
          </button>

          <div className="field">
            <label htmlFor="hPlusOnes">Plus-ones allowed</label>
            <select
              id="hPlusOnes"
              value={form.plusOnes}
              onChange={(e) => setForm({ ...form, plusOnes: Number(e.target.value) })}
            >
              {Array.from({ length: MAX_PLUS_ONES + 1 }, (_, n) => (
                <option key={n} value={n}>
                  {n === 0 ? "None" : n}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="hName">Household name (optional)</label>
            <input
              id="hName"
              value={form.name}
              placeholder="Filled in from the names above if left blank"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="hEmail">Email (optional)</label>
            <input
              id="hEmail"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="hNotes">Notes (optional, only you see these)</label>
            <textarea
              id="hNotes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="admin-toolbar-actions">
            <button type="submit" className="btn btn-primary" disabled={busy === "save"}>
              {busy === "save" ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {households.length === 0 ? (
        <p className="page-lead">No households yet. Add one or import from JSON.</p>
      ) : (
        <>
          <div className="field admin-filter">
            <label htmlFor="guestFilter">Search</label>
            <input
              id="guestFilter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Name or email"
            />
          </div>
          <div className="panel" style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Household</th>
                  <th>Guests</th>
                  <th>Plus-ones</th>
                  <th>Email</th>
                  <th>RSVP</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((h) => (
                  <tr key={h.id}>
                    <td>{h.name}</td>
                    <td>
                      {h.guests
                        .filter((g) => !g.isPlusOne)
                        .map((g) => `${g.firstName} ${g.lastName}`)
                        .join(", ")}
                    </td>
                    <td>{h.plusOnes || "—"}</td>
                    <td>{h.email || "—"}</td>
                    <td>
                      <span className={`status-badge status-${h.status}`}>
                        {STATUS_LABEL[h.status]}
                      </span>
                    </td>
                    <td>{h.notes || "—"}</td>
                    <td>
                      <div className="admin-row-actions">
                        {h.email ? (
                          <button
                            type="button"
                            className="btn btn-ghost admin-remove-btn"
                            onClick={() => sendEmail(h)}
                          >
                            Email
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-ghost admin-remove-btn"
                          onClick={() => openEdit(h)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost admin-remove-btn"
                          onClick={() => removeHousehold(h)}
                          disabled={busy === h.id}
                        >
                          {busy === h.id ? "…" : "Remove"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
