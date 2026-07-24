import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ScamLens AI — Stop Scams Before They Stop You" },
      {
        name: "description",
        content:
          "Analyze suspicious messages, emails, screenshots and links with AI. Detect phishing, fraud and social engineering before you become a victim.",
      },
      { property: "og:title", content: "ScamLens AI — AI Scam & Phishing Detector" },
      {
        property: "og:description",
        content:
          "AI-assisted risk analysis for suspicious messages, emails, screenshots and links.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.replace("/scamlens/index.html");
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: "#070B14", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      Loading ScamLens AI…
    </div>
  );
}
