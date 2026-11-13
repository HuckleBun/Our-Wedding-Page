"use client";

import { FormEvent, useState } from "react";
import type { PublicHousehold } from "@/lib/public-household";

type Step = "lookup" | "choose" | "respond" | "done";

type PlusOneDraft = { key: string; firstName: string; lastName: string };

function newKey() {
  return Math.random().toString(36).slice(2);
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
  return json;
}

export function RsvpForm() {
  const [step, setStep] = useState<Step>("lookup");
  const [lookup, setLookup] = useState({ firstName: "", lastName: "" });
  const [matches, setMatches] = useState<PublicHousehold[]>([]);
  const [household, setHousehold] = useState<PublicHousehold | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean | undefined>>({});
  const [plusOnes, setPlusOnes] = useState<PlusOneDraft[]>([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function openHousehold(h: PublicHousehold) {
    setHousehold(h);
    setAnswers(
      Object.fromEntries(h.guests.map((g) => [g.id, g.attending ?? undefined]))
    );
    setPlusOnes(h.plusOneGuests.map((g) => ({ key: newKey(), ...g })));
    setMessage(h.message ?? "");
    setError("");
    setStep("respond");
  }

  function startOver() {
    setStep("lookup");
    setHousehold(null);
    setMatches([]);
    setError("");
  }

  async function onLookup(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const json = await postJson("/api/rsvp/lookup", lookup);
      const found: PublicHousehold[] = json.households;
      if (found.length === 1) {
        openHousehold(found[0]);
      } else {
        setMatches(found);
        setStep("choose");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!household) return;

    const unanswered = household.guests.filter((g) => answers[g.id] === undefined);
    if (unanswered.length > 0) {
      setError(
        `Please let us know whether ${unanswered.map((g) => g.firstName).join(" and ")} can attend.`
      );
      return;
    }

    setBusy(true);
    setError("");
    try {
      const json = await postJson("/api/rsvp", {
        householdId: household.id,
        lookupFirstName: lookup.firstName,
        lookupLastName: lookup.lastName,
        responses: household.guests.map((g) => ({
          guestId: g.id,
          attending: answers[g.id],
        })),
        plusOneGuests: anyoneAttending
          ? plusOnes.map(({ firstName, lastName }) => ({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
            }))
          : [],
        email: email.trim() || null,
        message: message.trim() || null,
      });
      setHousehold(json.household);
      setStep("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const anyoneAttending = household
    ? household.guests.some((g) => answers[g.id] === true)
    : false;

  const errorNotice = error ? <div className="notice notice-error">{error}</div> : null;

  if (step === "lookup") {
    return (
      <form className="form panel" onSubmit={onLookup}>
        <p className="rsvp-intro">
          Enter the first and last name of anyone in your party, as it appears on your
          invitation.
        </p>
        {errorNotice}
        <div className="field">
          <label htmlFor="lookupFirstName">First name</label>
          <input
            id="lookupFirstName"
            value={lookup.firstName}
            onChange={(e) => setLookup({ ...lookup, firstName: e.target.value })}
            required
            autoComplete="given-name"
          />
        </div>
        <div className="field">
          <label htmlFor="lookupLastName">Last name</label>
          <input
            id="lookupLastName"
            value={lookup.lastName}
            onChange={(e) => setLookup({ ...lookup, lastName: e.target.value })}
            required
            autoComplete="family-name"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Searching…" : "Find my invitation"}
        </button>
      </form>
    );
  }

  if (step === "choose") {
    return (
      <div className="form panel">
        <p className="rsvp-intro">
          We found more than one invitation with that name. Which one is yours?
        </p>
        {matches.map((h) => (
          <button
            key={h.id}
            type="button"
            className="btn rsvp-choice"
            onClick={() => openHousehold(h)}
          >
            {h.guests.map((g) => `${g.firstName} ${g.lastName}`).join(", ")}
          </button>
        ))}
        <button type="button" className="btn btn-ghost" onClick={startOver}>
          Search again
        </button>
      </div>
    );
  }

  if (step === "done" && household) {
    const attending = [
      ...household.guests.filter((g) => g.attending),
      ...household.plusOneGuests,
    ];
    const declined = household.guests.filter((g) => g.attending === false);
    return (
      <div className="form panel rsvp-done">
        <h2 className="rsvp-household">Thank you!</h2>
        <p className="rsvp-intro">
          {attending.length > 0
            ? "We've received your RSVP and can't wait to celebrate with you."
            : "We've received your RSVP. We'll miss you!"}
        </p>
        {attending.length > 0 ? (
          <p>
            <strong>Attending:</strong>{" "}
            {attending.map((g) => `${g.firstName} ${g.lastName}`).join(", ")}
          </p>
        ) : null}
        {declined.length > 0 ? (
          <p>
            <strong>Not attending:</strong>{" "}
            {declined.map((g) => `${g.firstName} ${g.lastName}`).join(", ")}
          </p>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => openHousehold(household)}
        >
          Change response
        </button>
      </div>
    );
  }

  if (!household) return null;

  const canAddPlusOne = anyoneAttending && plusOnes.length < household.plusOnes;

  return (
    <form className="form panel" onSubmit={onSubmit}>
      <h2 className="rsvp-household">{household.name}</h2>
      {household.responded ? (
        <div className="notice">
          You&apos;ve already responded. Make any changes below and submit again.
        </div>
      ) : null}
      {errorNotice}

      {household.guests.map((guest) => (
        <fieldset key={guest.id} className="rsvp-guest">
          <legend className="rsvp-guest-name">
            {guest.firstName} {guest.lastName}
          </legend>
          <div className="radio-row">
            <label>
              <input
                type="radio"
                name={`attending_${guest.id}`}
                checked={answers[guest.id] === true}
                onChange={() => setAnswers({ ...answers, [guest.id]: true })}
              />
              Joyfully accepts
            </label>
            <label>
              <input
                type="radio"
                name={`attending_${guest.id}`}
                checked={answers[guest.id] === false}
                onChange={() => setAnswers({ ...answers, [guest.id]: false })}
              />
              Regretfully declines
            </label>
          </div>
        </fieldset>
      ))}

      {household.plusOnes > 0 && anyoneAttending ? (
        <div className="rsvp-plus-ones">
          <p className="rsvp-plus-ones-note">
            Your invitation includes{" "}
            {household.plusOnes === 1 ? "a guest" : `up to ${household.plusOnes} guests`}.
          </p>
          {plusOnes.map((p, index) => (
            <fieldset key={p.key} className="guest-group">
              <legend className="guest-group-legend">
                <span>Guest {household.plusOnes > 1 ? index + 1 : ""}</span>
                <button
                  type="button"
                  className="btn btn-ghost guest-remove"
                  onClick={() => setPlusOnes(plusOnes.filter((x) => x.key !== p.key))}
                >
                  Remove
                </button>
              </legend>
              <div className="field">
                <label htmlFor={`plusFirst_${p.key}`}>First name</label>
                <input
                  id={`plusFirst_${p.key}`}
                  value={p.firstName}
                  onChange={(e) =>
                    setPlusOnes(
                      plusOnes.map((x) =>
                        x.key === p.key ? { ...x, firstName: e.target.value } : x
                      )
                    )
                  }
                  required
                  autoComplete="off"
                />
              </div>
              <div className="field">
                <label htmlFor={`plusLast_${p.key}`}>Last name</label>
                <input
                  id={`plusLast_${p.key}`}
                  value={p.lastName}
                  onChange={(e) =>
                    setPlusOnes(
                      plusOnes.map((x) =>
                        x.key === p.key ? { ...x, lastName: e.target.value } : x
                      )
                    )
                  }
                  required
                  autoComplete="off"
                />
              </div>
            </fieldset>
          ))}
          {canAddPlusOne ? (
            <button
              type="button"
              className="btn btn-ghost add-guest-btn"
              onClick={() =>
                setPlusOnes([...plusOnes, { key: newKey(), firstName: "", lastName: "" }])
              }
            >
              Add a guest
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="rsvpEmail">Email (optional, for a confirmation)</label>
        <input
          id="rsvpEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      <div className="field">
        <label htmlFor="rsvpMessage">Message to the couple (optional)</label>
        <textarea
          id="rsvpMessage"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Submitting…" : household.responded ? "Update RSVP" : "Submit RSVP"}
      </button>
      <button type="button" className="btn btn-ghost" onClick={startOver}>
        Not you? Search again
      </button>
    </form>
  );
}
