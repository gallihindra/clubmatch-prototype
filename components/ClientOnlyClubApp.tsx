"use client";

import dynamic from "next/dynamic";

const ClubApp = dynamic(() => import("@/components/ClubApp"), {
  ssr: false,
  loading: () => null
});

export default function ClientOnlyClubApp() {
  return <ClubApp />;
}
