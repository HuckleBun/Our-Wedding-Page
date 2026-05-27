"use client";

import { FormEvent, useState } from "react";

const MAX_GUESTS = 10;

type AdditionalGuest = {
  id: string;
  firstName: string;
  lastName: string;
};

function createGuest(): AdditionalGuest {
  return {
    id: crypto.randomUUID(),
    firstName: "",
    lastName: "",
  };
}

export function RsvpForm() {
  const [additionalGuests, setAdditionalGuests] = useState<AdditionalGuest[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState("");

  function addGuest() {
    if (additionalGuests.length >= MAX_GUESTS - 1) return;
    setAdditionalGuests((current) => [...current, createGuest()]);
  }

  function removeGuest(id: string) {
    setAdditionalGuests((current) => current.filter((guest) => guest.id !== id));
  }

  function updateGuest(
    id: string,
    field: "firstName" | "lastName",
    value: string
  ) {
    setAdditionalGuests((current) =>
      current.map((guest) =>
        guest.id === id ? { ...guest, [field]: value } : guest
      )
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const form = e.currentTarget;
    const data = new FormData(form);

    const body = {
      firstName: String(data.get("firstName") || "").trim(),
      lastName: String(data.get("lastName") || "").trim(),
      email: String(data.get("email") || "").trim(),
      additionalGuests: additionalGuests.map(({ firstName, lastName }) => ({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })),
      message: String(data.get("message") || "").trim() || null,
    };

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Something went wrong");
      }
      setStatus("success");
      setAdditionalGuests([]);
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "success") {
    return (
      <div className="notice notice-success">
        Thank you! Your RSVP has been received.
      </div>
    );
  }

  const canAddGuest = additionalGuests.length < MAX_GUESTS - 1;

  return (
    <form className="form panel" onSubmit={onSubmit}>
      {status === "error" && error ? (
        <div className="notice notice-error">{error}</div>
      ) : null}

      <div className="field">
        <label htmlFor="firstName">Your first name</label>
        <input id="firstName" name="firstName" required autoComplete="given-name" />
      </div>

      <div className="field">
        <label htmlFor="lastName">Your last name</label>
        <input id="lastName" name="lastName" required autoComplete="family-name" />
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>

      {additionalGuests.map((guest, index) => (
        <fieldset key={guest.id} className="guest-group">
          <legend className="guest-group-legend">
            <span>Guest {index + 2}</span>
            <button
              type="button"
              className="btn btn-ghost guest-remove"
              onClick={() => removeGuest(guest.id)}
            >
              Remove
            </button>
          </legend>
          <div className="field">
            <label htmlFor={`guestFirstName_${guest.id}`}>First name</label>
            <input
              id={`guestFirstName_${guest.id}`}
              value={guest.firstName}
              onChange={(e) => updateGuest(guest.id, "firstName", e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor={`guestLastName_${guest.id}`}>Last name</label>
            <input
              id={`guestLastName_${guest.id}`}
              value={guest.lastName}
              onChange={(e) => updateGuest(guest.id, "lastName", e.target.value)}
              required
              autoComplete="off"
            />
          </div>
        </fieldset>
      ))}

      <button
        type="button"
        className="btn btn-ghost add-guest-btn"
        onClick={addGuest}
        disabled={!canAddGuest}
      >
        Add guest
      </button>

      <div className="field">
        <label htmlFor="message">Message to the couple (optional)</label>
        <textarea id="message" name="message" />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Submitting…" : "Submit RSVP"}
      </button>
    </form>
  );
}
