import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AssessmentIcon from "@mui/icons-material/Assessment";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useDataProvider, type Identifier } from "react-admin";

import type {
  ActiveAssessmentsBundle,
  AssessmentBase,
  AssessmentSeverity,
  MyDataProvider,
} from "../../dataProvider";

interface Props {
  carePlanId: Identifier;
  /** Optional collapse default state (default: collapsed). */
  defaultOpen?: boolean;
}

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
};

// The backend ships admin URLs as paths starting with '/admin/...'.
// In production the React app and the Django admin live at the same
// host but the React app talks to the FastAPI mount under '/fast', so
// resolving '/admin/...' relative to the page would land on the React
// host (wrong). Strip '/fast' from VITE_SIMPLE_REST_URL to get the
// Django host base and build absolute URLs.
const getDjangoBaseUrl = (): string => {
  const apiUrl =
    (import.meta.env.VITE_SIMPLE_REST_URL as string | undefined) || "";
  return apiUrl.replace(/\/fast\/?$/, "");
};

const toAdminUrl = (path: string | null | undefined): string => {
  if (!path) return "#";
  if (/^https?:\/\//i.test(path)) return path;
  const base = getDjangoBaseUrl();
  return `${base}${path.startsWith("/") ? path : "/" + path}`;
};

// Translate the backend severity bucket into a MUI Chip color so the
// score badge is glanceable (green / orange / red).
const SEVERITY_CHIP: Record<
  Exclude<AssessmentSeverity, null>,
  "success" | "warning" | "error"
> = {
  good: "success",
  moderate: "warning",
  bad: "error",
};

const ScoreChip = ({ assessment }: { assessment: AssessmentBase }) => {
  if (assessment.score === null) {
    return (
      <Chip
        label="Pas de score"
        size="small"
        variant="outlined"
        sx={{ height: 22 }}
      />
    );
  }
  const color = assessment.severity ? SEVERITY_CHIP[assessment.severity] : "default";
  const text = assessment.max_score != null
    ? `${assessment.score} / ${assessment.max_score}`
    : `${assessment.score}`;
  return (
    <Tooltip title={assessment.severity_label || ""} arrow>
      <Chip
        label={text}
        size="small"
        color={color}
        sx={{ fontWeight: 600 }}
      />
    </Tooltip>
  );
};

const EditLink = ({ url, label = "Modifier" }: { url: string; label?: string }) => (
  <Button
    component="a"
    href={toAdminUrl(url)}
    target="_blank"
    rel="noopener"
    size="small"
    variant="text"
    startIcon={<OpenInNewIcon fontSize="small" />}
    sx={{ minWidth: 0, py: 0.25, px: 1, fontSize: 11 }}
  >
    {label}
  </Button>
);

const AddLink = ({ url, label = "Ajouter" }: { url: string; label?: string }) => (
  <Button
    component="a"
    href={toAdminUrl(url)}
    target="_blank"
    rel="noopener"
    size="small"
    variant="outlined"
    startIcon={<AddIcon fontSize="small" />}
    sx={{ py: 0.25, px: 1, fontSize: 11 }}
  >
    {label}
  </Button>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box sx={{ display: "flex", gap: 1, alignItems: "baseline" }}>
    <Typography
      variant="caption"
      sx={{ fontWeight: 600, minWidth: 160, color: "text.secondary" }}
    >
      {label}
    </Typography>
    <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
      {children}
    </Typography>
  </Box>
);

const AssessmentBlock = ({
  title,
  subtitle,
  data,
  addUrl,
}: {
  title: string;
  subtitle?: React.ReactNode;
  data: AssessmentBase | null;
  addUrl: string;
}) => {
  return (
    <Box
      sx={{
        p: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        backgroundColor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {data ? <ScoreChip assessment={data} /> : null}
        <Box sx={{ flex: 1 }} />
        {data ? (
          <EditLink url={data.admin_url} />
        ) : (
          <AddLink url={addUrl} />
        )}
      </Box>
      {data ? (
        <Box sx={{ pl: 0.5 }}>
          {data.severity_label && (
            <Typography
              variant="caption"
              sx={{
                color:
                  data.severity === "good"
                    ? "success.main"
                    : data.severity === "moderate"
                      ? "warning.main"
                      : data.severity === "bad"
                        ? "error.main"
                        : "text.secondary",
                fontWeight: 600,
                display: "block",
              }}
            >
              {data.severity_label}
            </Typography>
          )}
          {subtitle}
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Aucune évaluation enregistrée pour ce patient.
        </Typography>
      )}
    </Box>
  );
};

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
  }, [carePlanId, dataProvider]);

  const renderAnamnesis = () => {
    const a = data?.anamnesis;
    const addUrl = data?.admin_create_urls.anamnesis ?? "#";
    return (
      <Box
        sx={{
          p: 1.5,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          backgroundColor: "background.paper",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            Anamnèse
          </Typography>
          <Box sx={{ flex: 1 }} />
          {a ? (
            <EditLink url={a.admin_url} />
          ) : (
            <AddLink url={addUrl} />
          )}
        </Box>
        {a ? (
          <Stack spacing={0.5}>
            <Row label="Premier contact">{formatDate(a.first_contact_date)}</Row>
            <Row label="Début du contrat">{formatDate(a.contract_start_date)}</Row>
            {a.civil_status && <Row label="État civil">{a.civil_status}</Row>}
            {a.legal_protection_regimes && (
              <Row label="Régime de protection">{a.legal_protection_regimes}</Row>
            )}
            {a.anticipated_directives && (
              <Row label="Directives anticipées">{a.anticipated_directives}</Row>
            )}
            {(a.spoken_languages || a.understood_languages) && (
              <Row label="Langues">
                {[
                  a.spoken_languages && `parlées : ${a.spoken_languages}`,
                  a.understood_languages && `comprises : ${a.understood_languages}`,
                ]
                  .filter(Boolean)
                  .join(" — ")}
              </Row>
            )}
            {a.reason_for_dependence && (
              <Row label="Motif de dépendance">{a.reason_for_dependence}</Row>
            )}
            {a.general_evaluation && (
              <Row label="Évaluation générale">
                <Box component="span" sx={{ whiteSpace: "pre-wrap" }}>
                  {a.general_evaluation}
                </Box>
              </Row>
            )}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Aucune anamnèse pour ce patient.
          </Typography>
        )}
      </Box>
    );
  };

  // At-a-glance severity chips shown in the panel header so the
  // clinician can spot concerning scores without expanding.
  const summaryChips: { key: string; label: string; data: AssessmentBase | null }[] = data
    ? [
        { key: "mms", label: "MMS", data: data.mms },
        { key: "gds15", label: "GDS-15", data: data.gds15 },
        { key: "mna", label: "MNA", data: data.mna },
        { key: "braden", label: "Braden", data: data.braden },
        { key: "tinetti", label: "Tinetti", data: data.tinetti },
        { key: "mif", label: "MIF", data: data.mif },
        { key: "fall_risk", label: "Chute", data: data.fall_risk },
      ]
    : [];

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          gap: 1,
          flexWrap: "wrap",
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
        {!loading && data && (
          <Box
            sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", flex: 1, justifyContent: "flex-end" }}
            onClick={(e) => e.stopPropagation()}
          >
            {summaryChips.map(({ key, label, data: a }) => {
              if (!a) {
                return (
                  <Tooltip key={key} title="Pas d'évaluation enregistrée" arrow>
                    <Chip
                      label={`${label} —`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 22, fontSize: 11 }}
                    />
                  </Tooltip>
                );
              }
              const color = a.severity ? SEVERITY_CHIP[a.severity] : "default";
              const text = a.score === null
                ? `${label} ?`
                : a.max_score != null
                  ? `${label} ${a.score}/${a.max_score}`
                  : `${label} ${a.score}`;
              return (
                <Tooltip key={key} title={a.severity_label || ""} arrow>
                  <Chip
                    label={text}
                    size="small"
                    color={color}
                    sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
                  />
                </Tooltip>
              );
            })}
          </Box>
        )}
        <IconButton size="small">
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={open}>
        <Box sx={{ mt: 2 }}>
          {renderAnamnesis()}

          <Box
            sx={{
              mt: 2,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <AssessmentBlock
              title="MMS (cognitif)"
              data={data?.mms ?? null}
              addUrl={data?.admin_create_urls.mms ?? "#"}
              subtitle={
                data?.mms?.examination_date && (
                  <Typography variant="caption" color="text.secondary">
                    Évalué le {formatDate(data.mms.examination_date)}
                    {data.mms.examiner ? ` — ${data.mms.examiner}` : ""}
                    {data.mms.evaluation_impossible ? " (évaluation impossible)" : ""}
                  </Typography>
                )
              }
            />
            <AssessmentBlock
              title="GDS-15 (dépression)"
              data={data?.gds15 ?? null}
              addUrl={data?.admin_create_urls.gds15 ?? "#"}
              subtitle={
                data?.gds15?.assessment_date && (
                  <Typography variant="caption" color="text.secondary">
                    Évalué le {formatDate(data.gds15.assessment_date)}
                    {data.gds15.examiner ? ` — ${data.gds15.examiner}` : ""}
                  </Typography>
                )
              }
            />
            <AssessmentBlock
              title="Braden (escarres)"
              data={data?.braden ?? null}
              addUrl={data?.admin_create_urls.braden ?? "#"}
              subtitle={
                data?.braden?.assessment_date && (
                  <Typography variant="caption" color="text.secondary">
                    Évalué le {formatDate(data.braden.assessment_date)}
                  </Typography>
                )
              }
            />
            <AssessmentBlock
              title="Risque de chute"
              data={data?.fall_risk ?? null}
              addUrl={data?.admin_create_urls.fall_risk ?? "#"}
              subtitle={
                data?.fall_risk?.assessment_date && (
                  <Typography variant="caption" color="text.secondary">
                    Évalué le {formatDate(data.fall_risk.assessment_date)}
                    {data.fall_risk.risk_level ? ` — ${data.fall_risk.risk_level}` : ""}
                  </Typography>
                )
              }
            />
            <AssessmentBlock
              title="MNA (nutrition)"
              data={data?.mna ?? null}
              addUrl={data?.admin_create_urls.mna ?? "#"}
              subtitle={
                data?.mna?.assessment_date && (
                  <Typography variant="caption" color="text.secondary">
                    Évalué le {formatDate(data.mna.assessment_date)}
                    {data.mna.assessment_type
                      ? ` — ${data.mna.assessment_type === "SCREENING" ? "Dépistage" : "Complet"}`
                      : ""}
                  </Typography>
                )
              }
            />
            <AssessmentBlock
              title="Tinetti (équilibre/marche)"
              data={data?.tinetti ?? null}
              addUrl={data?.admin_create_urls.tinetti ?? "#"}
              subtitle={
                data?.tinetti?.assessment_date && (
                  <Typography variant="caption" color="text.secondary">
                    Évalué le {formatDate(data.tinetti.assessment_date)}
                    {data.tinetti.balance_score != null && data.tinetti.gait_score != null
                      ? ` — équilibre ${data.tinetti.balance_score}/16 · marche ${data.tinetti.gait_score}/12`
                      : ""}
                  </Typography>
                )
              }
            />
            <AssessmentBlock
              title="MIF (indépendance)"
              data={data?.mif ?? null}
              addUrl={data?.admin_create_urls.mif ?? "#"}
              subtitle={
                data?.mif?.assessment_date && (
                  <Typography variant="caption" color="text.secondary">
                    Évalué le {formatDate(data.mif.assessment_date)}
                    {data.mif.motor_score != null && data.mif.cognitive_score != null
                      ? ` — moteur ${data.mif.motor_score}/91 · cognitif ${data.mif.cognitive_score}/35`
                      : ""}
                  </Typography>
                )
              }
            />
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};
