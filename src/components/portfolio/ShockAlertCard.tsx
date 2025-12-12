// src/components/portfolio/ShockAlertCard.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import type { ShockAlert } from "@/domain/shock/types";

type Props = {
  alert: ShockAlert;
  onExplain?: () => void;
  onDismiss?: () => void;
};

function badgeVariant(sev: ShockAlert["severity"]) {
  if (sev === "EXTREME") return "destructive";
  return "secondary";
}

export default function ShockAlertCard({ alert, onExplain, onDismiss }: Props) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card 
        className="border cursor-pointer transition-shadow hover:shadow-md"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <CardTitle className="text-base shrink-0">Shock Watch</CardTitle>
              {!isExpanded && (
                <p className="text-sm text-muted-foreground truncate flex-1">
                  {alert.message}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
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
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.div>
              {onDismiss && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss();
                  }}
                  className="p-1 rounded-sm hover:bg-muted transition-colors"
                  aria-label="Dismiss alert"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <CardContent 
                className="space-y-4 pt-0"
                onClick={(e) => e.stopPropagation()}
              >
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
                          onClick={(e) => {
                            e.stopPropagation();
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
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onExplain();
                        setIsExpanded(false);
                      }}
                    >
                      Explain why
                    </Button>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
