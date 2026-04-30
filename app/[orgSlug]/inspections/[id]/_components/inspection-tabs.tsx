"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AlertTriangle, ClipboardList, Info } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useT } from "@/components/i18n-provider";

export type DetailTab = "checklist" | "findings" | "details";

interface Props {
  defaultTab?: DetailTab;
  findingsCount: number;
  checklistTotal: number;
  checklist: React.ReactNode;
  findings: React.ReactNode;
  details: React.ReactNode;
}

const VALID: DetailTab[] = ["checklist", "findings", "details"];

export function InspectionTabs({
  defaultTab = "checklist",
  findingsCount,
  checklistTotal,
  checklist,
  findings,
  details,
}: Props) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initial = (() => {
    const v = searchParams?.get("tab") as DetailTab | null;
    return v && VALID.includes(v) ? v : defaultTab;
  })();
  const [tab, setTab] = React.useState<DetailTab>(initial);

  React.useEffect(() => {
    const v = searchParams?.get("tab") as DetailTab | null;
    if (v && VALID.includes(v) && v !== tab) setTab(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function onChange(next: string) {
    const v = next as DetailTab;
    setTab(v);
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    if (v === "checklist") sp.delete("tab");
    else sp.set("tab", v);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <Tabs value={tab} onValueChange={onChange} className="space-y-3">
      {/* Tab bar — sticky only on desktop so mobile users keep the screen real estate */}
      <div className="md:sticky md:top-16 md:z-10 -mx-4 border-y bg-background/90 px-4 py-1.5 backdrop-blur md:mx-0 md:rounded-2xl md:border md:px-2 md:py-2">
        <TabsList className="h-10 w-full justify-start gap-0.5 overflow-x-auto md:h-11 md:w-auto md:gap-1">
          <TabsTrigger value="checklist" className="gap-1 px-2 md:gap-1.5 md:px-3">
            <ClipboardList className="h-4 w-4" />
            <span>{t("modules.inspections.tab.checklist")}</span>
            {checklistTotal > 0 && (
              <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                {checklistTotal}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="findings" className="gap-1 px-2 md:gap-1.5 md:px-3">
            <AlertTriangle className="h-4 w-4" />
            <span>{t("modules.inspections.tab.findings")}</span>
            {findingsCount > 0 && (
              <span className="ml-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-destructive">
                {findingsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-1 px-2 md:gap-1.5 md:px-3">
            <Info className="h-4 w-4" />
            <span>{t("modules.inspections.tab.details")}</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="checklist" className="mt-0 focus-visible:ring-0">
        {checklist}
      </TabsContent>
      <TabsContent value="findings" className="mt-0 focus-visible:ring-0">
        {findings}
      </TabsContent>
      <TabsContent value="details" className="mt-0 focus-visible:ring-0">
        {details}
      </TabsContent>
    </Tabs>
  );
}
