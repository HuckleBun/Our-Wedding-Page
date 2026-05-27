"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type InviteeRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  notes: string | null;
  hasRsvp: boolean;
};

type AdminContactTableProps = {
  invitees: InviteeRow[];
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  notes: string;
};

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  notes: "",
};

export function AdminContactTable({ invitees }: AdminContactTableProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
  }

  function openEdit(invitee: InviteeRow) {
    setEditingId(invitee.id);
    setForm({
      firstName: invitee.firstName,
      lastName: invitee.lastName,
      email: invitee.email,
      notes: invitee.notes || "",
    });
    setShowForm(true);
    setError("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy("save");
    setError("");

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      notes: form.notes.trim() || null,
    };

    try {
      const res = await fetch(
        editingId ? `/api/admin/contacts/${editingId}` : "/api/admin/contacts",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save contact.");

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contact.");
    } finally {
      setBusy(null);
    }
  }

  async function removeContact(invitee: InviteeRow) {
    const confirmed = window.confirm(
      `Remove ${invitee.firstName} ${invitee.lastName}? This cannot be undone.`
    );
    if (!confirmed) return;

    setBusy(invitee.id);
    setError("");

    try {
      const res = await fetch(`/api/admin/contacts/${invitee.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to remove contact.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove contact.");
    } finally {
      setBusy(null);
    }
  }

  async function importFromJson() {
    const confirmed = window.confirm(
      "Import contacts from src/data/guest-list.json? Existing emails will be updated."
    );
    if (!confirmed) return;

    setImporting(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/email/import", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed.");

      setMessage(
        `Import complete: ${json.created} created, ${json.updated} updated, ${json.skipped} skipped.`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  function sendEmail(invitee: InviteeRow) {
    const params = new URLSearchParams({
      mode: "single",
      email: invitee.email,
      firstName: invitee.firstName,
      lastName: invitee.lastName,
      inviteeId: invitee.id,
    });
    router.push(`/admin/email?${params.toString()}`);
  }

  return (
    <>
      <div className="panel admin-toolbar">
        <p style={{ margin: 0 }}>
          <strong>{invitees.length}</strong> contacts
        </p>
        <div className="admin-toolbar-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Add contact
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={importFromJson}
            disabled={importing}
          >
            {importing ? "Importing…" : "Import from JSON"}
          </button>
        </div>
      </div>

      {message ? <div className="notice notice-success">{message}</div> : null}
      {error ? <div className="notice notice-error">{error}</div> : null}

      {showForm ? (
        <form className="form panel" onSubmit={onSubmit} style={{ marginBottom: 16 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>
            {editingId ? "Edit contact" : "Add contact"}
          </h2>
          <div className="field">
            <label htmlFor="contactFirstName">First name</label>
            <input
              id="contactFirstName"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="contactLastName">Last name</label>
            <input
              id="contactLastName"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="contactEmail">Email</label>
            <input
              id="contactEmail"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="contactNotes">Notes (optional)</label>
            <textarea
              id="contactNotes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="admin-toolbar-actions">
            <button type="submit" className="btn btn-primary" disabled={busy === "save"}>
              {busy === "save" ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {invitees.length === 0 ? (
        <p className="page-lead">No contacts yet. Add one or import from JSON.</p>
      ) : (
        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>RSVP</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invitees.map((invitee) => (
                <tr key={invitee.id}>
                  <td>
                    {invitee.firstName} {invitee.lastName}
                  </td>
                  <td>{invitee.email}</td>
                  <td>
                    <span
                      className={`status-badge${invitee.hasRsvp ? " status-yes" : " status-no"}`}
                    >
                      {invitee.hasRsvp ? "Yes" : "No"}
                    </span>
                  </td>
                  <td>{invitee.notes || "—"}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="btn btn-ghost admin-remove-btn"
                        onClick={() => sendEmail(invitee)}
                      >
                        Email
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost admin-remove-btn"
                        onClick={() => openEdit(invitee)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost admin-remove-btn"
                        onClick={() => removeContact(invitee)}
                        disabled={busy === invitee.id}
                      >
                        {busy === invitee.id ? "…" : "Remove"}
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
