import Image from "next/image";
import { getSite } from "@/lib/site";

export function WeddingPartyGrid() {
  const site = getSite();

  return (
    <div className="party-grid">
      {site.weddingParty.map((member) => (
        <article key={`${member.name}-${member.role}`} className="party-card">
          <Image
            src={member.image}
            alt={member.name}
            width={400}
            height={400}
            unoptimized
          />
          <div className="party-card-body">
            <h3>{member.name}</h3>
            <p className="party-role">{member.role}</p>
            <p className="party-bio">{member.bio}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
