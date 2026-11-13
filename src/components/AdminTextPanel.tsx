"use client";

import { useEffect, useState } from "react";
import textTemplates from "@/data/text-templates.json";
import type { SerializedHousehold } from "@/lib/households";
import { renderTemplate, type TemplateVars } from "@/lib/template";

type TemplateKey = keyof typeof textTemplates;
const TEMPLATE_KEYS = Object.keys(textTemplates) as TemplateKey[];

/** Works on iPhone and Android; on a computer it opens a linked phone app if there is one. */
function smsHref(phone: string, body: string) {
  return `sms:${phone}?&body=${encodeURIComponent(body)}`;
}

/**
 * Prepares a text for one household at a time. Texts are sent from the couple's own
 * phone: "Open in Messages" starts the text, or the message can be copied and pasted.
 */
export function AdminTextPanel({
  households,
  baseVars,
  onClose,
}: {
  households: SerializedHousehold[];
  baseVars: TemplateVars;
  onClose: () => void;
}) {
  const [templateKey, setTemplateKey] = useState<TemplateKey>("saveTheDate");
  const [index, setIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<"message" | "number" | null>(null);
  const [opened, setOpened] = useState<Set<string>>(new Set());

  const household = households[Math.min(index, households.length - 1)];

  // Rebuild the message when switching template or household (discarding manual edits).
  useEffect(() => {
    if (!household) return;
    setMessage(
      renderTemplate(textTemplates[templateKey].body, {
        ...baseVars,
        greeting: household.greeting,
        householdName: household.name,
      })
    );
  }, [templateKey, household, baseVars]);

  if (!household || !household.phone) return null;
  const phone = household.phone;

  async function copy(kind: "message" | "number", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  function markOpened() {
    setOpened(new Set(opened).add(household.id));
  }

  const queue = households.length > 1;

  return (
    <div className="panel admin-text-panel">
      <div className="admin-text-head">
        <h2>
          Text {household.name}
          {queue ? (
            <span className="admin-text-count">
              {" "}
              · {index + 1} of {households.length}
            </span>
          ) : null}
        </h2>
        <button type="button" className="btn btn-ghost admin-remove-btn" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="admin-text-grid">
        <div className="field">
          <label htmlFor="textTemplate">Message</label>
          <select
            id="textTemplate"
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value as TemplateKey)}
          >
            {TEMPLATE_KEYS.map((key) => (
              <option key={key} value={key}>
                {textTemplates[key].label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>To</label>
          <p className="admin-text-phone">{household.phoneDisplay}</p>
        </div>
      </div>

      <div className="field">
        <label htmlFor="textBody">Text (you can edit before sending)</label>
        <textarea
          id="textBody"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
        />
      </div>

      <div className="admin-toolbar-actions">
        <a className="btn btn-primary" href={smsHref(phone, message)} onClick={markOpened}>
          {opened.has(household.id) ? "Open in Messages again" : "Open in Messages"}
        </a>
        <button type="button" className="btn btn-ghost" onClick={() => copy("message", message)}>
          {copied === "message" ? "Copied" : "Copy message"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => copy("number", household.phoneDisplay ?? phone)}
        >
          {copied === "number" ? "Copied" : "Copy number"}
        </button>
      </div>

      {queue ? (
        <div className="admin-toolbar-actions admin-text-nav">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setIndex(index - 1)}
            disabled={index === 0}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setIndex(index + 1)}
            disabled={index >= households.length - 1}
          >
            Next household
          </button>
          <span className="admin-hint">{opened.size} opened so far</span>
        </div>
      ) : null}

      <p className="admin-hint">
        Texts come from your own phone. On your phone, &ldquo;Open in Messages&rdquo; starts
        the text for you to review and send. On a computer, copy the message and number
        instead.
      </p>
    </div>
  );
}
