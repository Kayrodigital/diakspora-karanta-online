import type { CSSProperties } from "react";
import type { OrganizationBrand } from "@/lib/auth/portal-access";

type OrganizationTheme = CSSProperties & {
  "--deep-green": string;
  "--gold": string;
};

export function organizationTheme(organization: OrganizationBrand): OrganizationTheme {
  return {
    "--deep-green": organization.primary_color,
    "--gold": organization.accent_color,
  };
}
