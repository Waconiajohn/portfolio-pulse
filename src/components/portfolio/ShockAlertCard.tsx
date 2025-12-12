// src/components/portfolio/ShockAlertCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { ShockAlert } from "@/domain/shock/types";

type Props = {
  alert: ShockAlert;
  onExplain?: () => void;
};

function badgeVariant(sev: ShockAlert["severity"]) {
  if (sev === "EXTREME") return "destructive";
  return "secondary";
}

export default function ShockAlertCard({ alert, onExplain }: Props) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">{alert.title}</CardTitle>
            {alert.severity === "EXTREME" ? (
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <Badge variant={badgeVariant(alert.severity)}>{alert.severity}</Badge>
              </motion.div>
            ) : (
              <Badge variant={badgeVariant(alert.severity)}>{alert.severity}</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">{alert.message}</div>

          {alert.drivers?.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Top drivers</div>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {alert.drivers.map((d, idx) => (
                  <li key={idx} className="text-muted-foreground">
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {alert.actions?.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Recommended next steps</div>
              <div className="flex flex-wrap gap-2">
                {alert.actions.map((a, idx) => (
                  <Button
                    key={`${a.kind}-${idx}`}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (a.deepLink) navigate(a.deepLink);
                    }}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {onExplain && (
            <div className="pt-1">
              <Button size="sm" onClick={onExplain}>
                Explain why
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
