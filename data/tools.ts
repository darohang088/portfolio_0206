// Tools listed on the Tools page.
export type Tool = { href: string; icon: string; name: string; description: string; tags: string[]; locked?: boolean };

export const tools: Tool[] = [
  {
    href: "/apk",
    icon: "🛡️",
    name: "APK Security Check",
    description: "Drop an Android APK and get a security grade: debug settings, network, exported screens, signing, permissions and hardcoded secrets. Runs in your browser.",
    tags: ["Android", "Security", "Free"],
  },
  {
    href: "/test",
    icon: "📱",
    name: "Test App",
    description: "Preview private app builds on real iPhone-size screens (393 × 852), up to 12 at once. Each project needs its PIN.",
    tags: ["Preview", "PIN"],
    locked: true,
  },
];
