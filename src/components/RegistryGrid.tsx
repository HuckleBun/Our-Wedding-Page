"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { RegistryItem } from "@/lib/site";
import {
  formatPrice,
  normalizeImagePath,
  safeURL,
} from "@/lib/registry-utils";

const CLAIMS_KEY = "wedding-registry-claimed-v1";

type PreparedItem = RegistryItem & {
  link: string;
  image: string;
};

function prepareItems(raw: RegistryItem[], claimed: Set<string>): PreparedItem[] {
  return raw.map((x) => ({
    ...x,
    link: safeURL(x.link || ""),
    image: normalizeImagePath(x.image || ""),
    claimed: x.id ? claimed.has(x.id) : false,
  }));
}

type RegistryGridProps = {
  items: RegistryItem[];
};

export function RegistryGrid({ items }: RegistryGridProps) {
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLAIMS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setClaimedIds(
            new Set(parsed.filter((id) => typeof id === "string"))
          );
        }
      }
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);

  const saveClaims = useCallback((next: Set<string>) => {
    setClaimedIds(next);
    localStorage.setItem(CLAIMS_KEY, JSON.stringify([...next]));
  }, []);

  const toggleClaim = (id: string) => {
    const next = new Set(claimedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    saveClaims(next);
  };

  const resetClaims = () => {
    if (!claimedIds.size) return;
    if (
      !window.confirm(
        "Remove all purchased marks on this device?"
      )
    ) {
      return;
    }
    saveClaims(new Set());
  };

  if (!items.length) {
    return (
      <p className="page-lead">
        No registry items yet. Add entries to <code>src/data/items.json</code>.
      </p>
    );
  }

  const prepared = prepareItems(items, claimedIds);
  const hasClaims = claimedIds.size > 0;

  return (
    <>
      {mounted && hasClaims ? (
        <div className="registry-toolbar">
          <button type="button" className="btn btn-ghost" onClick={resetClaims}>
            Reset purchased marks
          </button>
        </div>
      ) : null}
      <ul className="registry-grid">
        {prepared.map((item) => (
          <RegistryCard
            key={item.id}
            item={item}
            isClaimed={!!item.id && claimedIds.has(item.id)}
            onToggleClaim={() => item.id && toggleClaim(item.id)}
          />
        ))}
      </ul>
    </>
  );
}

function RegistryCard({
  item,
  isClaimed,
  onToggleClaim,
}: {
  item: PreparedItem;
  isClaimed: boolean;
  onToggleClaim: () => void;
}) {
  const productUrl = item.link;

  const openStore = () => {
    if (productUrl) window.open(productUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <li
      className={`registry-card${isClaimed ? " claimed" : ""}${productUrl ? " clickable" : ""}`}
      tabIndex={productUrl ? 0 : undefined}
      role={productUrl ? "link" : undefined}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(".claim-btn")) return;
        openStore();
      }}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest(".claim-btn")) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openStore();
        }
      }}
    >
      <div className="thumb-wrap">
        {isClaimed ? <span className="purchased-badge">Purchased</span> : null}
        {item.image ? (
          <Image
            src={item.image}
            alt={item.title}
            width={400}
            height={300}
            unoptimized
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
      </div>
      <div className="registry-body">
        <div className="registry-title-row">
          <h3>{item.title}</h3>
          <span className="registry-price">{formatPrice(item.price)}</span>
        </div>
        {item.notes ? <p className="registry-notes">{item.notes}</p> : null}
      </div>
      <div className="registry-actions">
        <button
          type="button"
          className={`claim-btn${isClaimed ? " is-claimed" : ""}`}
          aria-pressed={isClaimed}
          onClick={(e) => {
            e.stopPropagation();
            onToggleClaim();
          }}
        >
          {isClaimed ? "Undo purchased" : "Mark as purchased"}
        </button>
      </div>
    </li>
  );
}
