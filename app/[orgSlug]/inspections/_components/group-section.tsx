import {
  AlarmClock,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  FileText,
  PlayCircle,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { getT } from "@/lib/i18n";
import { InspectionRow, type InspectionRowData } from "./inspection-row";

type IconKey =
  | "alarm"
  | "today"
  | "tomorrow"
  | "calendar"
  | "play"
  | "draft"
  | "check";
type Tone = "destructive" | "warning" | "primary" | "secondary" | "success";

const ICONS: Record<IconKey, React.ComponentType<{ className?: string }>> = {
  alarm: AlarmClock,
  today: Sun,
  tomorrow: CalendarCheck,
  calendar: CalendarDays,
  play: PlayCircle,
  draft: FileText,
  check: CheckCircle2,
};

const TONES: Record<
  Tone,
  { ring: string; icon: string; bar: string }
> = {
  destructive: {
    ring: "border-destructive/40",
    icon: "bg-destructive/10 text-destructive",
    bar: "from-destructive/30",
  },
  warning: {
    ring: "border-warning/40",
    icon: "bg-warning/10 text-warning-foreground",
    bar: "from-warning/30",
  },
  primary: {
    ring: "",
    icon: "bg-primary/10 text-primary",
    bar: "from-primary/30",
  },
  secondary: {
    ring: "",
    icon: "bg-muted text-foreground/80",
    bar: "from-muted/40",
  },
  success: {
    ring: "",
    icon: "bg-success/10 text-success",
    bar: "from-success/30",
  },
};

interface Props {
  title: string;
  icon: IconKey;
  tone: Tone;
  items: InspectionRowData[];
  isInspector: boolean;
}

export async function GroupSection({
  title,
  icon,
  tone,
  items,
  isInspector,
}: Props) {
  const { t } = await getT();
  const Icon = ICONS[icon] ?? Calendar;
  const toneCfg = TONES[tone];

  return (
    <Card className={cn("overflow-hidden", toneCfg.ring)}>
      <header
        className={cn(
          "flex items-center gap-2 border-b bg-gradient-to-r to-transparent px-4 py-2.5 sm:px-5",
          toneCfg.bar,
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            toneCfg.icon,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {items.length}
        </span>
      </header>
      <ul className="divide-y">
        {items.map((i) => (
          <li key={i.id} className="relative">
            <InspectionRow
              i={i}
              showAssignee={!isInspector}
              statusLabel={t(`modules.inspections.statusLabel.${i.status}`)}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
