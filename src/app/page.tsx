import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Dashboard } from "@/components/dashboard";
import type { HealthData } from "@/lib/types";

export default function Page() {
  const raw = readFileSync(join(process.cwd(), "public", "data", "health.json"), "utf8");
  const data = JSON.parse(raw) as HealthData;
  return <Dashboard data={data} />;
}
