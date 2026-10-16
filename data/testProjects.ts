// Projects on the Test page. Each one opens the phone preview after its 4-digit PIN.
// pinHash is the SHA-256 of the PIN (hex), so the PIN itself isn't written in the code.
// Note: this only keeps casual visitors out; anyone can still read the site's code.
export type TestProject = {
  id: string;
  name: string;
  logo: string;
  description: string;
  tags: string[];
  pinHash: string;
};

export const testProjects: TestProject[] = [
  {
    id: "tos",
    name: "Test Tos",
    logo: "/apps/tos.webp",
    description:
      "Preview builds of Tos (តោះ), the social activity app for Cambodian Gen Z. Check screens at real iPhone size before release.",
    tags: ["Flutter", "Pre-launch", "Private"],
    pinHash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",
  },
];
