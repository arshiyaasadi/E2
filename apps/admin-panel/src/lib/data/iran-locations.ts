import provincesData from "@/resources/data/iran/provinces.json";
import citiesData from "@/resources/data/iran/cities-filtered.json";

export type IranProvinceRecord = {
  id: number;
  name: string;
  slug: string;
  tel_prefix: string;
};

export type IranCityRecord = {
  id: number;
  name: string;
  slug: string;
  province_id: number;
  county_id: number;
};

const provinces = provincesData as IranProvinceRecord[];
const cities = citiesData as IranCityRecord[];

const provinceById = new Map(provinces.map((p) => [p.id, p]));
const cityById = new Map(cities.map((c) => [c.id, c]));

const citiesByProvinceId = new Map<number, IranCityRecord[]>();
for (const city of cities) {
  const list = citiesByProvinceId.get(city.province_id);
  if (list) list.push(city);
  else citiesByProvinceId.set(city.province_id, [city]);
}

export function findProvinceById(id: number | string) {
  const numericId = typeof id === "string" ? Number(id) : id;
  if (!Number.isFinite(numericId)) return null;
  return provinceById.get(numericId) ?? null;
}

export function findCityById(cityId: number | string) {
  const numericId = typeof cityId === "string" ? Number(cityId) : cityId;
  if (!Number.isFinite(numericId)) return null;
  return cityById.get(numericId) ?? null;
}

export function getProvinceOptions() {
  return provinces.map((p) => ({ value: String(p.id), label: p.name }));
}

export function getCityOptions(provinceId: number | string) {
  const numericId = typeof provinceId === "string" ? Number(provinceId) : provinceId;
  if (!Number.isFinite(numericId)) return [];
  const list = citiesByProvinceId.get(numericId) ?? [];
  return list.map((c) => ({ value: String(c.id), label: c.name }));
}

export function findProvinceIdByName(name: string): string {
  const normalized = name.trim();
  if (!normalized) return "";
  return String(provinces.find((p) => p.name === normalized)?.id ?? "");
}

export function findCityIdByName(provinceId: number | string, name: string): string {
  const numericProvinceId = typeof provinceId === "string" ? Number(provinceId) : provinceId;
  const normalized = name.trim();
  if (!Number.isFinite(numericProvinceId) || !normalized) return "";
  const list = citiesByProvinceId.get(numericProvinceId) ?? [];
  return String(list.find((c) => c.name === normalized)?.id ?? "");
}

export function getProvinceName(provinceId: number | string) {
  return findProvinceById(provinceId)?.name ?? "";
}

export function getCityName(cityId: number | string) {
  return findCityById(cityId)?.name ?? "";
}

export function parseProvinceId(value: string): number | null {
  const id = Number(value);
  if (!Number.isFinite(id) || !provinceById.has(id)) return null;
  return id;
}

export function parseCityId(value: string, provinceId?: number | null): number | null {
  const id = Number(value);
  if (!Number.isFinite(id)) return null;
  const city = cityById.get(id);
  if (!city) return null;
  if (provinceId != null && city.province_id !== provinceId) return null;
  return id;
}
