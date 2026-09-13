import type { CSSProperties } from "react";
import type { OrganizationBrand } from "@/lib/auth/portal-access";

type OrganizationTheme = CSSProperties & {
  "--deep-green": string;
  "--deep-green-hi": string;
  "--gold": string;
  "--gold-soft": string;
  "--gold-dark": string;
  "--primary": string;
  "--accent": string;
  "--ring": string;
};

export function organizationTheme(organization: OrganizationBrand): OrganizationTheme {
  return {
    "--deep-green": organization.primary_color,
    "--deep-green-hi": `color-mix(in oklab, ${organization.primary_color} 72%, white)`,
    "--gold": organization.accent_color,
    "--gold-soft": `color-mix(in oklab, ${organization.accent_color} 62%, white)`,
    "--gold-dark": `color-mix(in oklab, ${organization.accent_color} 78%, black)`,
    "--primary": organization.primary_color,
    "--accent": organization.accent_color,
    "--ring": organization.accent_color,
  };
}
