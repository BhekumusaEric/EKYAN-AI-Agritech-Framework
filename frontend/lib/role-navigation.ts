export const ROLE_OPTIONS = [
  { value: "agripreneur", label: "Agripreneur" },
  { value: "supplier", label: "Supplier" },
  { value: "lender", label: "Lender" },
  { value: "extension", label: "Extension officer" },
  { value: "programme", label: "Programme manager" },
  { value: "admin", label: "Administrator" },
  { value: "buyer", label: "Buyer · Phase 2" },
  { value: "investor", label: "Investor · preview" },
] as const;

export type PreviewRole = (typeof ROLE_OPTIONS)[number]["value"];

export const ROLE_WORKSPACES: Record<
  PreviewRole,
  { home: string; links: { href: string; label: string; icon: string }[] }
> = {
  agripreneur: {
    home: "/home",
    links: [
      { href: "/home", label: "Today", icon: "dashboard" },
      { href: "/field-log", label: "Record a need", icon: "field" },
      { href: "/blockers", label: "Follow up", icon: "blockers" },
      { href: "/business-book", label: "Business records", icon: "business" },
    ],
  },
  supplier: {
    home: "/demand",
    links: [{ href: "/demand", label: "Pooled demand", icon: "demand" }],
  },
  lender: {
    home: "/lender",
    links: [{ href: "/lender", label: "Consented profiles", icon: "lender" }],
  },
  extension: {
    home: "/extension",
    links: [{ href: "/extension", label: "Assigned blockers", icon: "extension" }],
  },
  programme: {
    home: "/dashboard",
    links: [{ href: "/dashboard", label: "Programme dashboard", icon: "dashboard" }],
  },
  admin: {
    home: "/configuration",
    links: [{ href: "/configuration", label: "Pilot configuration", icon: "settings" }],
  },
  buyer: {
    home: "/marketplace",
    links: [{ href: "/marketplace", label: "Buyer marketplace", icon: "demand" }],
  },
  investor: {
    home: "/investor",
    links: [{ href: "/investor", label: "Opportunity profiles", icon: "lender" }],
  },
};

export function roleForPath(path: string): PreviewRole {
  if (
    path.startsWith("/home") ||
    path.startsWith("/farmer") ||
    path.startsWith("/field-log") ||
    path.startsWith("/blockers") ||
    path.startsWith("/agronomist") ||
    path.startsWith("/business-book") ||
    path.startsWith("/credit")
  ) {
    return "agripreneur";
  }
  if (path.startsWith("/demand")) return "supplier";
  if (path.startsWith("/lender")) return "lender";
  if (path.startsWith("/extension")) return "extension";
  if (path.startsWith("/configuration")) return "admin";
  if (path.startsWith("/marketplace")) return "buyer";
  if (path.startsWith("/investor")) return "investor";
  return "programme";
}
