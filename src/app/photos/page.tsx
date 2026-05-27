import { PageHeader } from "@/components/PageHeader";
// import { PhotosGallery } from "@/components/PhotosGallery";

export default function PhotosPage() {
  return (
    <div className="container">
      <PageHeader
        title="Photos"
        lead="Moments from our journey together."
      />
      <p className="page-lead coming-soon">Coming soon</p>
      {/* <PhotosGallery /> */}
    </div>
  );
}
