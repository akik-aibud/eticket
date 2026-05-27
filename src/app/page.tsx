import { Suspense } from "react";
import { HomeClient } from "@/components/HomeClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 grid place-items-center">
          <div className="w-8 h-8 border-[3px] border-app border-t-brand-500 rounded-full animate-spin" />
        </div>
      }
    >
      <HomeClient />
    </Suspense>
  );
}
