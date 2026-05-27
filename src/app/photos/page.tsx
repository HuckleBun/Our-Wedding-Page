import Image from "next/image";
import { PageHeader } from "@/components/PageHeader";
import { getSite } from "@/lib/site";

export default function PhotosPage() {
  const site = getSite();

  return (
    <div className="container">
      <PageHeader
        title="Photos"
        lead="Moments from our journey together."
      />
      {site.photos.length === 0 ? (
        <p className="page-lead">
          Add photos in <code>src/data/site.json</code> and place files in{" "}
          <code>public/images/photos/</code>.
        </p>
      ) : (
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
      )}
    </div>
  );
}
