declare module "geoip-country" {
  interface Lookup {
    country: string;
  }

  export function lookup(ip: string): Lookup | null;
}
