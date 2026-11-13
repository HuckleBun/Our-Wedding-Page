import Image from "next/image";
import Link from "next/link";
import { getSite } from "@/lib/site";

export default function HomePage() {
  const site = getSite();
  const { home } = site;
  const heroImage = home.heroImage?.trim();

  return (
    <div className="home-page">
      {home.headline ? (
        <h2 className="home-headline">{home.headline}</h2>
      ) : null}
      <div className="home-hero-image-wrap">
        {heroImage ? (
          <Image
            src={heroImage}
            alt="Micah and Emily"
            width={1200}
            height={750}
            className="home-hero-image"
            priority
            unoptimized
          />
        ) : (
          <div className="home-hero-placeholder" aria-label="Photo placeholder">
            <span>Your photo here</span>
          </div>
        )}
      </div>

      <div className="home-info">
        <div className="home-info-col">
          <p>{home.dateLine1}</p>
          <p>{home.dateLine2}</p>
        </div>
        <div className="home-info-divider" aria-hidden="true" />
        <div className="home-info-col">
          <p>{home.locationLine1}</p>
          <p>{home.locationLine2}</p>
        </div>
      </div>

      <div className="home-rsvp-wrap">
        <Link href="/rsvp" className="home-rsvp-btn">
          RSVP
        </Link>
      </div>
    </div>
  );
}
