"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type EmailMeta = {
  configured: boolean;
  templates: string[];
  bulkTemplates: string[];
  inviteeCount: number;
  nonRsvpCount: number;
  previewVars: Record<string, string>;
};

type InviteeOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  hasRsvp: boolean;
};

export function AdminEmailComposer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const singleMode = searchParams.get("mode") === "single";

  const [meta, setMeta] = useState<EmailMeta | null>(null);
  const [invitees, setInvitees] = useState<InviteeOption[]>([]);
  const [templateKey, setTemplateKey] = useState("invitation");
  const [recipientMode, setRecipientMode] = useState<"all" | "selected" | "nonRsvp" | "single">(
    singleMode ? "single" : "all"
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewBody, setPreviewBody] = useState("");
  const [singleEmail, setSingleEmail] = useState(searchParams.get("email") || "");
  const [singleFirstName, setSingleFirstName] = useState(
    searchParams.get("firstName") || ""
  );
  const [singleLastName, setSingleLastName] = useState(
    searchParams.get("lastName") || ""
  );
  const [singleInviteeId, setSingleInviteeId] = useState(
    searchParams.get("inviteeId") || ""
  );
  const [singleRsvpId, setSingleRsvpId] = useState(searchParams.get("rsvpId") || "");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [metaRes, contactsRes] = await Promise.all([
          fetch("/api/admin/email/send"),
          fetch("/api/admin/contacts"),
        ]);
        const metaJson = await metaRes.json();
        const contactsJson = await contactsRes.json();
        if (!metaRes.ok) throw new Error(metaJson.error || "Failed to load email settings.");
        if (!contactsRes.ok) {
          throw new Error(contactsJson.error || "Failed to load contacts.");
        }

        setMeta(metaJson);
        setInvitees(contactsJson.invitees || []);
        if (!singleMode && metaJson.bulkTemplates?.length) {
          setTemplateKey(metaJson.bulkTemplates[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [singleMode]);

  const recipientCount = useMemo(() => {
    if (recipientMode === "single") return 1;
    if (recipientMode === "all") return invitees.length;
    if (recipientMode === "nonRsvp") {
      return invitees.filter((i) => !i.hasRsvp).length;
    }
    return selectedIds.length;
  }, [recipientMode, invitees, selectedIds]);

  useEffect(() => {
    async function loadPreview() {
      if (!meta) return;
      const res = await fetch("/api/admin/email/send", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey,
          firstName: singleMode ? singleFirstName : meta.previewVars.firstName,
          lastName: singleMode ? singleLastName : meta.previewVars.lastName,
          guestEmail: meta.previewVars.guestEmail,
          guestCount: meta.previewVars.guestCount,
          guestMessage: meta.previewVars.guestMessage,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setPreviewSubject(json.subject);
        setPreviewBody(json.body);
      }
    }

    loadPreview();
  }, [templateKey, meta, singleMode, singleFirstName, singleLastName]);

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    const confirmed = window.confirm(
      recipientMode === "single"
        ? `Send "${templateKey}" email to ${singleEmail}?`
        : `Send "${templateKey}" to ${recipientCount} recipient(s)?`
    );
    if (!confirmed) return;

    setSending(true);

    try {
      const payload: Record<string, unknown> = {
        templateKey,
        recipientMode,
      };

      if (recipientMode === "single") {
        payload.email = singleEmail;
        payload.firstName = singleFirstName;
        payload.lastName = singleLastName;
        if (singleInviteeId) payload.inviteeId = singleInviteeId;
        if (singleRsvpId) payload.rsvpId = singleRsvpId;
      } else if (recipientMode === "selected") {
        payload.inviteeIds = selectedIds;
      }

      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send email.");

      if (recipientMode === "single") {
        setMessage("Email sent.");
      } else {
        setMessage(`Sent ${json.sent} email(s). Failed: ${json.failed}.`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <p className="page-lead">Loading email composer…</p>;
  }

  const templateOptions =
    recipientMode === "single" ? meta?.templates || [] : meta?.bulkTemplates || [];

  return (
    <form className="form panel admin-email-form" onSubmit={onSend}>
      {error ? <div className="notice notice-error">{error}</div> : null}
      {message ? <div className="notice notice-success">{message}</div> : null}

      {meta && !meta.configured ? (
        <div className="notice notice-error">
          Email is not configured. Set RESEND_API_KEY and EMAIL_FROM in your .env
          file. See docs/EMAIL_SETUP.md.
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="templateKey">Template</label>
        <select
          id="templateKey"
          value={templateKey}
          onChange={(e) => setTemplateKey(e.target.value)}
        >
          {templateOptions.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="recipientMode">Recipients</label>
        <select
          id="recipientMode"
          value={recipientMode}
          onChange={(e) =>
            setRecipientMode(e.target.value as typeof recipientMode)
          }
          disabled={singleMode}
        >
          <option value="all">All contacts ({meta?.inviteeCount ?? 0})</option>
          <option value="nonRsvp">
            Non-RSVP only ({meta?.nonRsvpCount ?? 0})
          </option>
          <option value="selected">Selected contacts</option>
          <option value="single">Single recipient</option>
        </select>
      </div>

      {recipientMode === "single" ? (
        <>
          <div className="field">
            <label htmlFor="singleFirstName">First name</label>
            <input
              id="singleFirstName"
              value={singleFirstName}
              onChange={(e) => setSingleFirstName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="singleLastName">Last name</label>
            <input
              id="singleLastName"
              value={singleLastName}
              onChange={(e) => setSingleLastName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="singleEmail">Email</label>
            <input
              id="singleEmail"
              type="email"
              value={singleEmail}
              onChange={(e) => setSingleEmail(e.target.value)}
              required
            />
          </div>
        </>
      ) : null}

      {recipientMode === "selected" ? (
        <div className="panel admin-select-list">
          {invitees.length === 0 ? (
            <p className="page-lead">No contacts available.</p>
          ) : (
            invitees.map((invitee) => (
              <label key={invitee.id} className="admin-select-item">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(invitee.id)}
                  onChange={() => toggleSelected(invitee.id)}
                />
                <span>
                  {invitee.firstName} {invitee.lastName} ({invitee.email})
                </span>
              </label>
            ))
          )}
        </div>
      ) : null}

      <div className="panel admin-preview">
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Preview</h2>
        <p style={{ margin: "0 0 8px" }}>
          <strong>Subject:</strong> {previewSubject}
        </p>
        <pre className="admin-preview-body">{previewBody}</pre>
      </div>

      <button type="submit" className="btn btn-primary" disabled={sending}>
        {sending
          ? "Sending…"
          : recipientMode === "single"
            ? "Send email"
            : `Send to ${recipientCount} recipient(s)`}
      </button>
    </form>
  );
}
