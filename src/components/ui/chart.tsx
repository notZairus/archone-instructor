import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    color?: string;
  };
};

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

function ChartContainer({
  id,
  className,
  config,
  children,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId}`;

  const cssVars = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [
      `--color-${key}`,
      value.color || "currentColor",
    ]),
  ) as React.CSSProperties;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video w-full items-center justify-center text-xs",
          className,
        )}
        style={{ ...cssVars, ...style }}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> & {
  hideLabel?: boolean;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "min-w-36 rounded-none border bg-popover px-3 py-2 text-xs shadow-md",
        className,
      )}
    >
      {label ? <p className="mb-1 text-muted-foreground">{label}</p> : null}

      <div className="space-y-1">
        {payload.map((item, index) => {
          const key = String(item.dataKey || item.name || "value");
          const itemConfig = config[key];

          return (
            <div
              key={`${key}-${index}`}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-muted-foreground">
                {itemConfig?.label || item.name || key}
              </span>
              <span className="font-medium">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent };
export type { ChartConfig };
