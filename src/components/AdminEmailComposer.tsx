"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type EmailMeta = {
  configured: boolean;
  templates: string[];
  bulkTemplates: string[];
  emailableCount: number;
  noEmailCount: number;
  nonRsvpCount: number;
  previewVars: Record<string, string>;
};

type HouseholdOption = {
  id: string;
  name: string;
  email: string | null;
  respondedAt: string | null;
};

export function AdminEmailComposer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const singleMode = searchParams.get("mode") === "single";

  const [meta, setMeta] = useState<EmailMeta | null>(null);
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);
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
  const singleHouseholdId = searchParams.get("householdId") || "";
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [metaRes, householdsRes] = await Promise.all([
          fetch("/api/admin/email/send"),
          fetch("/api/admin/households"),
        ]);
        const metaJson = await metaRes.json();
        const householdsJson = await householdsRes.json();
        if (!metaRes.ok) throw new Error(metaJson.error || "Failed to load email settings.");
        if (!householdsRes.ok) {
          throw new Error(householdsJson.error || "Failed to load the guest list.");
        }

        setMeta(metaJson);
        setHouseholds(
          ((householdsJson.households || []) as HouseholdOption[]).filter((h) => h.email)
        );
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
    if (recipientMode === "all") return households.length;
    if (recipientMode === "nonRsvp") {
      return households.filter((h) => !h.respondedAt).length;
    }
    return selectedIds.length;
  }, [recipientMode, households, selectedIds]);

  useEffect(() => {
    async function loadPreview() {
      if (!meta) return;
      const res = await fetch("/api/admin/email/send", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey,
          greeting: singleMode ? singleFirstName : meta.previewVars.greeting,
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
        if (singleHouseholdId) payload.householdId = singleHouseholdId;
      } else if (recipientMode === "selected") {
        payload.householdIds = selectedIds;
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
          <option value="all">
            All households with email ({meta?.emailableCount ?? 0})
          </option>
          <option value="nonRsvp">
            Not yet responded ({meta?.nonRsvpCount ?? 0})
          </option>
          <option value="selected">Selected households</option>
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

      {recipientMode !== "single" && meta && meta.noEmailCount > 0 ? (
        <p className="admin-hint">
          {meta.noEmailCount} household(s) have no email on file and won&apos;t receive
          this. Share the link with them another way.
        </p>
      ) : null}

      {recipientMode === "selected" ? (
        <div className="panel admin-select-list">
          {households.length === 0 ? (
            <p className="page-lead">No households with an email address.</p>
          ) : (
            households.map((household) => (
              <label key={household.id} className="admin-select-item">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(household.id)}
                  onChange={() => toggleSelected(household.id)}
                />
                <span>
                  {household.name} ({household.email})
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
