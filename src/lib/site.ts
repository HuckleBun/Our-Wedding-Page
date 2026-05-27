import siteData from "@/data/site.json";
import itemsData from "@/data/items.json";

export type SiteData = typeof siteData;
export type RegistryItem = (typeof itemsData.items)[number];

export function getSite(): SiteData {
  return siteData;
}

export function getRegistryItems(): RegistryItem[] {
  return itemsData.items;
}
