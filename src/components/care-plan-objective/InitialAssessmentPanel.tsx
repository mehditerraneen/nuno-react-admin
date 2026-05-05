import { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { useDataProvider, type Identifier } from "react-admin";

import type {
  ActiveAssessmentsBundle,
  MyDataProvider,
} from "../../dataProvider";

interface Props {
  carePlanId: Identifier;
  /** Optional collapse default state (default: collapsed). */
  defaultOpen?: boolean;
}

const formatDate = (iso: unknown): string => {
  if (typeof iso !== "string") return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
};

const getString = (
  obj: Record<string, unknown> | null | undefined,
  key: string,
): string | null => {
  const v = obj?.[key];
  return typeof v === "string" && v ? v : null;
};

const getNumber = (
  obj: Record<string, unknown> | null | undefined,
  key: string,
): number | null => {
  const v = obj?.[key];
  return typeof v === "number" ? v : null;
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box sx={{ display: "flex", gap: 1, alignItems: "baseline" }}>
    <Typography
      variant="caption"
      sx={{ fontWeight: 600, minWidth: 140, color: "text.secondary" }}
    >
      {label}
    </Typography>
    <Typography variant="body2">{children}</Typography>
  </Box>
);

export const InitialAssessmentPanel = ({ carePlanId, defaultOpen = false }: Props) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const [data, setData] = useState<ActiveAssessmentsBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dataProvider
      .getCarePlanActiveAssessments(carePlanId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [carePlanId, dataProvider]);

  const renderAnamnesis = () => {
    const a = data?.anamnesis;
    if (!a) return <Typography variant="body2" color="text.secondary">—</Typography>;
    return (
      <Stack spacing={0.5}>
        <Row label="Premier contact">{formatDate(a.first_contact_date)}</Row>
        <Row label="Début du contrat">{formatDate(a.contract_start_date)}</Row>
        {getString(a, "civil_status") && <Row label="État civil">{getString(a, "civil_status")}</Row>}
        {getString(a, "reason_for_dependence") && (
          <Row label="Motif de dépendance">{getString(a, "reason_for_dependence")}</Row>
        )}
        {getString(a, "general_evaluation") && (
          <Row label="Évaluation générale">
            <Box component="span" sx={{ whiteSpace: "pre-wrap" }}>
              {getString(a, "general_evaluation")}
            </Box>
          </Row>
        )}
      </Stack>
    );
  };

  const renderScore = (
    title: string,
    bundle: Record<string, unknown> | null | undefined,
    dateKey: string,
  ) => {
    if (!bundle) {
      return (
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">—</Typography>
        </Box>
      );
    }
    const score = getNumber(bundle, "score");
    const dateStr = formatDate(bundle[dateKey]);
    const extra = getString(bundle, "risk_level");
    return (
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>{title}</Typography>
        <Typography variant="body2">
          {score !== null ? `Score ${score}` : "—"}
          {extra ? ` — ${extra}` : ""}
          <Box component="span" sx={{ color: "text.secondary", ml: 1 }}>
            ({dateStr})
          </Box>
        </Typography>
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AssessmentIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Évaluation initiale
          </Typography>
          {loading && <CircularProgress size={14} sx={{ ml: 1 }} />}
        </Box>
        <IconButton size="small">
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={open}>
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
            Anamnèse
          </Typography>
          <Box sx={{ pl: 1, mt: 0.5, mb: 2 }}>{renderAnamnesis()}</Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            {renderScore("MMS (cognitif)", data?.mms, "examination_date")}
            {renderScore("GDS-15 (dépression)", data?.gds15, "assessment_date")}
            {renderScore("Braden (escarres)", data?.braden, "assessment_date")}
            {renderScore("Risque de chute", data?.fall_risk, "assessment_date")}
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};
