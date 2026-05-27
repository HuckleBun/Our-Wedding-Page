import siteData from "@/data/site.json";

export type SiteData = typeof siteData;

export function getSite(): SiteData {
  return siteData;
}
