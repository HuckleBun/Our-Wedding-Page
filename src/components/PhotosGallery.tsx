import Image from "next/image";
import { getSite } from "@/lib/site";

export function PhotosGallery() {
  const site = getSite();

  if (site.photos.length === 0) {
    return (
      <p className="page-lead">
        Add photos in <code>src/data/site.json</code> and place files in{" "}
        <code>public/images/photos/</code>.
      </p>
    );
  }

  return (
    <div className="photo-grid">
      {site.photos.map((photo, i) => (
        <figure key={`${photo.src}-${i}`} className="photo-card">
          <Image
            src={photo.src}
            alt={photo.alt}
            width={800}
            height={600}
            unoptimized
          />
          {photo.caption ? (
            <figcaption className="photo-caption">{photo.caption}</figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
