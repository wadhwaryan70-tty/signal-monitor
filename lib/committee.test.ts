import { describe, expect, it } from "vitest";
import { bestApproach, buildCommittee, personaForTitle } from "./committee";

describe("buying committee", () => {
  const art = (people: { name: string; title: string; persona: "decision_maker" | "champion" | "influencer" }[], date = "2026-10-10") => ({
    people,
    url: `https://x/${Math.random()}`,
    published_at: `${date}T00:00:00Z`,
    about_company: true,
  });

  it("merges repeat mentions of one person and adds the CRM contact last", () => {
    const c = buildCommittee({ key_contact: "Head of Warehousing" }, [
      art([{ name: "Satyajeet Singh", title: "Head of HR", persona: "decision_maker" }]),
      art([{ name: "satyajeet  singh", title: "HR head", persona: "decision_maker" }], "2026-10-09"),
    ]);
    expect(c).toHaveLength(2);
    expect(c[1]).toMatchObject({ source: "crm", title: "Head of Warehousing", persona: "champion" });
  });

  it("approaches an HR/ops person from the news before a CEO, else the CRM contact", () => {
    const ceoOnly = buildCommittee({ key_contact: "Plant HR Head" }, [art([{ name: "Bhavish Aggarwal", title: "CEO", persona: "decision_maker" }])]);
    expect(bestApproach(ceoOnly)?.source).toBe("crm");
    const withHr = buildCommittee({ key_contact: "Plant HR Head" }, [
      art([{ name: "A CEO", title: "CEO", persona: "decision_maker" }, { name: "New CHRO", title: "Chief Human Resources Officer", persona: "decision_maker" }]),
    ]);
    expect(bestApproach(withHr)?.name).toBe("New CHRO");
  });

  it("maps CRM titles to personas", () => {
    expect(personaForTitle("Chief People Officer")).toBe("decision_maker");
    expect(personaForTitle("VP Retail Operations")).toBe("champion");
    expect(personaForTitle("IT manager")).toBe("influencer");
  });
});
