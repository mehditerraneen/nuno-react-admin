import React, { useState, useEffect, useMemo } from "react";
import {
  useDataProvider,
  useNotify,
  Title,
} from "react-admin";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Divider,
  FormControlLabel,
  Tooltip,
} from "@mui/material";
import {
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import {
  type CarePlanDetail,
  type MyDataProvider,
  type CareOccurrence,
} from "../dataProvider";
import {
  calculateSessionDuration,
  calculateActualDaysPerWeek,
} from "../utils/timeUtils";

interface CarePlanSummary {
  id: number;
  patient_id: number;
  patient_name: string;
  plan_number: number;
  plan_start_date: string;
  last_valid_plan: boolean;
  selected: boolean;
}

interface SessionSlot {
  carePlanId: number;
  detailId: number;
  patientName: string;
  planNumber: number;
  detailName: string;
  timeStart: string;
  timeEnd: string;
  startMin: number;
  endMin: number;
  dayIndex: number;
  codes: string[];
  duration: number;
}

interface FixSuggestion {
  sessionIndex: number; // which session to move (0 or 1)
  label: string;
  newStart: string;
  newEnd: string;
  carePlanId: number;
  detailId: number;
}

interface Overlap {
  day: string;
  timeRange: string;
  sessions: SessionSlot[];
  overlapMinutes: number;
  fix: FixSuggestion;
}

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAY_MAP: Record<string, number> = { "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6 };

const timeToMin = (t: string): number => {
  const parts = t.split(":");
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
};

const minToTime = (m: number): string => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
};

const getActiveDays = (occurrences: CareOccurrence[]): number[] => {
  if (occurrences.some((o) => o.value === "*")) return [0, 1, 2, 3, 4, 5, 6];
  return occurrences
    .map((o) => DAY_MAP[o.value])
    .filter((d) => d !== undefined)
    .sort();
};

const COLORS = [
  "#1976d2", "#388e3c", "#f57c00", "#7b1fa2", "#c62828",
  "#00838f", "#4e342e", "#283593", "#1b5e20", "#bf360c",
];

export const CarePlanOverlapView = () => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const notify = useNotify();
  const [carePlans, setCarePlans] = useState<CarePlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [allSessions, setAllSessions] = useState<SessionSlot[]>([]);
  const [overlaps, setOverlaps] = useState<Overlap[]>([]);
  const [analyzed, setAnalyzed] = useState(false);

  // Load active care plans
  useEffect(() => {
    const loadPlans = async () => {
      setLoading(true);
      try {
        const response = await dataProvider.getList("careplans", {
          pagination: { page: 1, perPage: 200 },
          sort: { field: "patient_id", order: "ASC" },
          filter: { last_valid_plan: true },
        });

        // Fetch patient names
        const patientIds = [...new Set(response.data.map((p: any) => p.patient_id))];
        const patients: Record<number, string> = {};
        for (const pid of patientIds) {
          try {
            const pRes = await dataProvider.getOne("patients", { id: pid });
            patients[pid as number] = `${pRes.data.first_name} ${pRes.data.name}`;
          } catch {
            patients[pid as number] = `Patient #${pid}`;
          }
        }

        setCarePlans(
          response.data.map((cp: any) => ({
            id: cp.id,
            patient_id: cp.patient_id,
            patient_name: patients[cp.patient_id] || `Patient #${cp.patient_id}`,
            plan_number: cp.plan_number,
            plan_start_date: cp.plan_start_date,
            last_valid_plan: cp.last_valid_plan,
            selected: false, // None selected by default — user picks which to compare
          })),
        );
      } catch (error) {
        notify("Failed to load care plans", { type: "error" });
      } finally {
        setLoading(false);
      }
    };
    loadPlans();
  }, [dataProvider, notify]);

  const selectedPlans = carePlans.filter((cp) => cp.selected);

  const handleToggle = (id: number) => {
    setCarePlans((prev) =>
      prev.map((cp) => (cp.id === id ? { ...cp, selected: !cp.selected } : cp)),
    );
    setAnalyzed(false);
  };

  const handleSelectAll = () => {
    const allSelected = carePlans.every((cp) => cp.selected);
    setCarePlans((prev) => prev.map((cp) => ({ ...cp, selected: !allSelected })));
    setAnalyzed(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAllSessions([]);
    setOverlaps([]);

    try {
      const sessions: SessionSlot[] = [];

      for (const cp of selectedPlans) {
        const details: CarePlanDetail[] = await dataProvider.getCarePlanDetails(cp.id);
        const colorIdx = selectedPlans.indexOf(cp) % COLORS.length;

        for (const detail of details) {
          const ts = detail.time_start?.substring(0, 5) || "";
          const te = detail.time_end?.substring(0, 5) || "";
          if (!ts || !te) continue;

          const startMin = timeToMin(ts);
          const endMin = timeToMin(te);
          const dur = endMin - startMin;
          const activeDays = getActiveDays(detail.params_occurrence);
          const codes = detail.longtermcareitemquantity_set.map(
            (item) => item.long_term_care_item.code,
          );

          for (const dayIdx of activeDays) {
            sessions.push({
              carePlanId: cp.id,
              detailId: detail.id,
              patientName: cp.patient_name,
              planNumber: cp.plan_number,
              detailName: detail.name,
              timeStart: ts,
              timeEnd: te,
              startMin,
              endMin,
              dayIndex: dayIdx,
              codes,
              duration: dur,
            });
          }
        }
      }

      // Detect overlaps: sessions on the same day that overlap in time
      const detected: Overlap[] = [];
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const daySessions = sessions
          .filter((s) => s.dayIndex === dayIdx)
          .sort((a, b) => a.startMin - b.startMin);

        for (let i = 0; i < daySessions.length; i++) {
          for (let j = i + 1; j < daySessions.length; j++) {
            const a = daySessions[i];
            const b = daySessions[j];
            // Check overlap
            if (a.startMin < b.endMin && b.startMin < a.endMin) {
              const overlapStart = Math.max(a.startMin, b.startMin);
              const overlapEnd = Math.min(a.endMin, b.endMin);
              // Check if this overlap pair already recorded
              const existing = detected.find(
                (o) =>
                  o.day === DAY_NAMES[dayIdx] &&
                  o.sessions.some((s) => s === a) &&
                  o.sessions.some((s) => s === b),
              );
              if (!existing) {
                // Compute fix: move the later session to start after the earlier one ends
                // Pick the shorter session to move (less disruption)
                const moveIdx = a.duration <= b.duration ? 0 : 1;
                const stayer = moveIdx === 0 ? b : a;
                const mover = moveIdx === 0 ? a : b;
                // Move mover to right after stayer, or before stayer
                const afterStart = stayer.endMin;
                const afterEnd = afterStart + mover.duration;
                const beforeEnd = stayer.startMin;
                const beforeStart = beforeEnd - mover.duration;

                // Prefer "after" if it fits in the day, else "before"
                let fix: FixSuggestion;
                if (afterEnd <= 23 * 60) {
                  fix = {
                    sessionIndex: moveIdx,
                    label: `Décaler "${mover.detailName}" (${mover.patientName}) à ${minToTime(afterStart)}–${minToTime(afterEnd)}`,
                    newStart: minToTime(afterStart),
                    newEnd: minToTime(afterEnd),
                    carePlanId: mover.carePlanId,
                    detailId: mover.detailId,
                  };
                } else {
                  fix = {
                    sessionIndex: moveIdx,
                    label: `Décaler "${mover.detailName}" (${mover.patientName}) à ${minToTime(Math.max(0, beforeStart))}–${minToTime(beforeEnd)}`,
                    newStart: minToTime(Math.max(0, beforeStart)),
                    newEnd: minToTime(beforeEnd),
                    carePlanId: mover.carePlanId,
                    detailId: mover.detailId,
                  };
                }

                detected.push({
                  day: DAY_NAMES[dayIdx],
                  timeRange: `${minToTime(overlapStart)}–${minToTime(overlapEnd)}`,
                  sessions: [a, b],
                  overlapMinutes: overlapEnd - overlapStart,
                  fix,
                });
              }
            }
          }
        }
      }

      setAllSessions(sessions);
      setOverlaps(detected);
      setAnalyzed(true);
      notify(
        detected.length > 0
          ? `${detected.length} chevauchement(s) détecté(s)`
          : "Aucun chevauchement détecté",
        { type: detected.length > 0 ? "warning" : "success" },
      );
    } catch (error) {
      notify("Erreur lors de l'analyse", { type: "error" });
    } finally {
      setAnalyzing(false);
    }
  };

  // Build combined weekly view
  const weeklyGrid = useMemo(() => {
    if (!analyzed) return null;

    const daySlots: Record<number, SessionSlot[]> = {};
    for (let d = 0; d < 7; d++) {
      daySlots[d] = allSessions
        .filter((s) => s.dayIndex === d)
        .sort((a, b) => a.startMin - b.startMin);
    }

    // Find overlap pairs for highlighting
    const overlapSessionIds = new Set<string>();
    overlaps.forEach((o) => {
      o.sessions.forEach((s) => {
        overlapSessionIds.add(`${s.carePlanId}-${s.detailName}-${s.dayIndex}-${s.timeStart}`);
      });
    });

    return daySlots;
  }, [analyzed, allSessions, overlaps]);

  if (loading) return <CircularProgress sx={{ m: 4 }} />;

  return (
    <Box sx={{ p: 2 }}>
      <Title title="Détection des chevauchements" />

      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        Détection des Chevauchements de Soins
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Sélectionnez les plans de soins à comparer puis lancez l'analyse pour détecter
        les chevauchements horaires entre les passages.
      </Typography>

      {/* Plan Selection */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">
            Plans de Soins ({selectedPlans.length}/{carePlans.length} sélectionnés)
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" onClick={handleSelectAll}>
              {carePlans.every((cp) => cp.selected) ? "Tout désélectionner" : "Tout sélectionner"}
            </Button>
            <Button
              variant="contained"
              onClick={handleAnalyze}
              disabled={analyzing || selectedPlans.length === 0}
              startIcon={analyzing ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              {analyzing ? "Analyse..." : "Analyser"}
            </Button>
          </Box>
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {carePlans.map((cp, idx) => (
            <Chip
              key={cp.id}
              label={`${cp.patient_name} (Plan #${cp.plan_number})`}
              onClick={() => handleToggle(cp.id)}
              color={cp.selected ? "primary" : "default"}
              variant={cp.selected ? "filled" : "outlined"}
              sx={{
                borderLeft: cp.selected ? `4px solid ${COLORS[idx % COLORS.length]}` : undefined,
              }}
            />
          ))}
        </Box>
      </Paper>

      {/* Results */}
      {analyzed && (
        <>
          {/* Overlaps */}
          {overlaps.length > 0 ? (
            <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
              <Typography variant="subtitle2">
                {overlaps.length} chevauchement(s) détecté(s)
              </Typography>
            </Alert>
          ) : (
            <Alert severity="success" sx={{ mb: 2 }} icon={<CheckIcon />}>
              Aucun chevauchement détecté entre les plans sélectionnés.
            </Alert>
          )}

          {overlaps.length > 0 && (
            <Paper sx={{ p: 2, mb: 2, border: "2px solid #ed6c02" }}>
              <Typography variant="h6" color="warning.main" gutterBottom>
                Détail des Chevauchements
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#fff3e0" }}>
                      <TableCell sx={{ fontWeight: 600 }}>Jour</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Créneau</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Durée</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Sessions en conflit</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Correction proposée</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {overlaps.map((o, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Chip label={o.day} size="small" color="warning" />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{o.timeRange}</TableCell>
                        <TableCell>{o.overlapMinutes} min</TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                            {o.sessions.map((s, si) => {
                              const cpIdx = selectedPlans.findIndex((p) => p.id === s.carePlanId);
                              return (
                                <Chip
                                  key={si}
                                  label={`${s.patientName} — ${s.detailName} (${s.timeStart}–${s.timeEnd})`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ borderColor: COLORS[cpIdx % COLORS.length], borderWidth: 2 }}
                                />
                              );
                            })}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={`Appliquer: ${o.fix.newStart}–${o.fix.newEnd}`}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              onClick={async () => {
                                try {
                                  await dataProvider.updateCarePlanDetail(
                                    o.fix.carePlanId,
                                    o.fix.detailId,
                                    {
                                      time_start: o.fix.newStart,
                                      time_end: o.fix.newEnd,
                                    },
                                  );
                                  notify(`Session modifiée: ${o.fix.newStart}–${o.fix.newEnd}`, { type: "success" });
                                  // Re-analyze after fix
                                  handleAnalyze();
                                } catch (err) {
                                  notify("Erreur lors de la modification", { type: "error" });
                                }
                              }}
                              sx={{ textTransform: "none", fontSize: "0.75rem" }}
                            >
                              {o.fix.label}
                            </Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* Combined Weekly Calendar */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Planning Combiné
            </Typography>
            {weeklyGrid && (
              <TableContainer>
                <Table size="small" sx={{ tableLayout: "fixed" }}>
                  <TableHead>
                    <TableRow>
                      {DAY_NAMES.map((d, i) => (
                        <TableCell
                          key={d}
                          align="center"
                          sx={{
                            fontWeight: 700,
                            backgroundColor: i >= 5 ? "#e8eaf6" : "#f5f5f5",
                            borderBottom: "2px solid #1976d2",
                            color: "#1976d2",
                          }}
                        >
                          {d}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow sx={{ verticalAlign: "top" }}>
                      {DAY_NAMES.map((_, dayIdx) => {
                        const sessions = weeklyGrid[dayIdx] || [];
                        // Check which sessions overlap
                        const overlapKeys = new Set<string>();
                        overlaps
                          .filter((o) => o.day === DAY_NAMES[dayIdx])
                          .forEach((o) =>
                            o.sessions.forEach((s) =>
                              overlapKeys.add(`${s.carePlanId}-${s.detailName}-${s.timeStart}`),
                            ),
                          );

                        return (
                          <TableCell
                            key={dayIdx}
                            sx={{
                              p: 0.5,
                              verticalAlign: "top",
                              backgroundColor: dayIdx >= 5 ? "#fafafe" : "white",
                            }}
                          >
                            {sessions.length === 0 ? (
                              <Typography
                                variant="caption"
                                color="text.disabled"
                                sx={{ display: "block", textAlign: "center", py: 1 }}
                              >
                                —
                              </Typography>
                            ) : (
                              sessions.map((s, i) => {
                                const cpIdx = selectedPlans.findIndex((p) => p.id === s.carePlanId);
                                const color = COLORS[cpIdx % COLORS.length];
                                const isOverlap = overlapKeys.has(
                                  `${s.carePlanId}-${s.detailName}-${s.timeStart}`,
                                );
                                return (
                                  <Tooltip
                                    key={i}
                                    title={`${s.patientName} — ${s.detailName} (${s.codes.join(", ")})`}
                                  >
                                    <Box
                                      sx={{
                                        mb: 0.5,
                                        p: 0.5,
                                        borderLeft: `3px solid ${color}`,
                                        backgroundColor: isOverlap ? "#ffebee" : "#f5f5f5",
                                        borderRadius: 0.5,
                                        border: isOverlap ? "1px solid #ef5350" : undefined,
                                      }}
                                    >
                                      <Typography
                                        sx={{ fontSize: "7pt", fontWeight: 600, color }}
                                      >
                                        {s.timeStart}–{s.timeEnd}
                                      </Typography>
                                      <Typography
                                        sx={{
                                          fontSize: "6pt",
                                          color: "#555",
                                          lineHeight: 1.2,
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                        }}
                                      >
                                        {s.patientName.split(" ")[0]}
                                      </Typography>
                                      <Typography sx={{ fontSize: "6pt", color: "#888" }}>
                                        {s.detailName} ({s.duration}m)
                                      </Typography>
                                    </Box>
                                  </Tooltip>
                                );
                              })
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Legend */}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {selectedPlans.map((cp, idx) => (
                <Chip
                  key={cp.id}
                  label={`${cp.patient_name} (Plan #${cp.plan_number})`}
                  size="small"
                  sx={{
                    borderLeft: `4px solid ${COLORS[idx % COLORS.length]}`,
                    backgroundColor: "#f5f5f5",
                  }}
                />
              ))}
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};
