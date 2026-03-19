import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  Paper,
} from "@mui/material";
import { Print as PrintIcon, Close as CloseIcon, PictureAsPdf as PdfIcon } from "@mui/icons-material";
import { useDataProvider, Identifier } from "react-admin";
import {
  type CarePlanDetail,
  type CareOccurrence,
  type MyDataProvider,
} from "../dataProvider";
import {
  calculateSessionDuration,
  calculateActualDaysPerWeek,
  calculateCareItemsDailyDuration,
} from "../utils/timeUtils";

interface CarePlanPrintViewProps {
  record: any; // care plan record
  patient: any; // patient record
  details: CarePlanDetail[];
}

const formatTime = (t: string) => {
  if (!t) return "";
  // Handle HH:MM:SS → HH:MM
  return t.substring(0, 5);
};

const formatDate = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

interface Branding {
  company_name: string;
  company_tagline: string;
  company_website: string;
  company_email: string;
  logo_url: string;
}

const PrintContent = React.forwardRef<HTMLDivElement, CarePlanPrintViewProps>(
  ({ record, patient, details }, ref) => {
    const dataProvider = useDataProvider<MyDataProvider>();
    const [missingCodes, setMissingCodes] = useState<any[]>([]);
    const [branding, setBranding] = useState<Branding | null>(null);

    useEffect(() => {
      const apiUrl = (import.meta.env.VITE_SIMPLE_REST_URL || "").replace(/\/fast\/?$/, "");
      fetch(`${apiUrl}/branding`)
        .then((r) => r.json())
        .then((data) => setBranding(data))
        .catch(() => {});
    }, []);

    useEffect(() => {
      if (record?.medical_care_summary_per_patient_id) {
        const usedCodes = new Set<string>();
        details.forEach((d) =>
          d.longtermcareitemquantity_set.forEach((item) =>
            usedCodes.add(item.long_term_care_item.code),
          ),
        );
        dataProvider
          .getCnsCarePlanDetails(record.medical_care_summary_per_patient_id)
          .then((cnsDetails: any[]) => {
            setMissingCodes(
              cnsDetails.filter((d: any) => d.item?.code && !usedCodes.has(d.item.code)),
            );
          })
          .catch(() => {});
      }
    }, [record, details, dataProvider]);

    // Compute summary stats
    const codeStats = new Map<string, { weeklyPkg: number; sessionDur: number; totalOcc: number }>();
    let totalSessionMinutes = 0;
    details.forEach((detail) => {
      const daysPerWeek = calculateActualDaysPerWeek(detail.params_occurrence) || 1;
      const sessionDur = calculateSessionDuration(detail.time_start, detail.time_end);
      totalSessionMinutes += sessionDur * daysPerWeek;
      detail.longtermcareitemquantity_set.forEach((item) => {
        const code = item.long_term_care_item.code;
        const wp = item.long_term_care_item.weekly_package || 0;
        const sd = (item.long_term_care_item as any).session_duration || wp / 7;
        const existing = codeStats.get(code);
        if (existing) {
          existing.totalOcc += item.quantity * daysPerWeek;
        } else {
          codeStats.set(code, { weeklyPkg: wp, sessionDur: sd, totalOcc: item.quantity * daysPerWeek });
        }
      });
    });
    const totalWeeklyPkg = Array.from(codeStats.values()).reduce((s, v) => s + v.weeklyPkg, 0);
    const totalConsumed = Array.from(codeStats.values()).reduce(
      (s, v) => s + Math.round(v.sessionDur * v.totalOcc * 100) / 100, 0,
    );

    const patientName = patient
      ? `${patient.first_name} ${patient.name}`
      : `Patient #${record?.patient_id}`;
    const patientSN = patient?.code_sn || "";

    const printStyles: React.CSSProperties = {
      fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
      color: "#333",
      fontSize: "11pt",
      lineHeight: 1.5,
    };

    const headerCell: React.CSSProperties = {
      fontWeight: 700,
      fontSize: "9pt",
      padding: "6px 10px",
      backgroundColor: "#f0f4f8",
      borderBottom: "2px solid #1976d2",
      color: "#1976d2",
    };

    const cell: React.CSSProperties = {
      fontSize: "10pt",
      padding: "5px 10px",
      borderBottom: "1px solid #e0e0e0",
    };

    return (
      <Box ref={ref} sx={{ p: 4, maxWidth: 800, mx: "auto", ...printStyles }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {branding?.logo_url && (
              <img
                src={branding.logo_url}
                alt={branding.company_name}
                style={{ maxHeight: 60, maxWidth: 150, objectFit: "contain" }}
              />
            )}
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "#1976d2", mb: 0.5 }}>
                Plan de Soins
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Plan n&deg;{record?.plan_number}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            {branding && (
              <>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {branding.company_name}
                </Typography>
                {branding.company_tagline && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {branding.company_tagline}
                  </Typography>
                )}
              </>
            )}
            <Typography variant="caption" color="text.secondary">
              {formatDate(new Date().toISOString())}
            </Typography>
          </Box>
        </Box>

        {/* Patient Info */}
        <Box sx={{
          border: "1px solid #1976d2",
          borderRadius: 1,
          p: 2,
          mb: 3,
          backgroundColor: "#f8faff",
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            {patientName}
          </Typography>
          <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {patientSN && (
              <Typography variant="body2">
                <strong>N&deg; CNS:</strong> {patientSN}
              </Typography>
            )}
            <Typography variant="body2">
              <strong>Debut:</strong> {formatDate(record?.plan_start_date)}
            </Typography>
            {record?.plan_end_date && (
              <Typography variant="body2">
                <strong>Fin:</strong> {formatDate(record.plan_end_date)}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Weekly Calendar Grid */}
        {(() => {
          const DAYS = [
            { value: "0", label: "Lun" },
            { value: "1", label: "Mar" },
            { value: "2", label: "Mer" },
            { value: "3", label: "Jeu" },
            { value: "4", label: "Ven" },
            { value: "5", label: "Sam" },
            { value: "6", label: "Dim" },
          ];

          // Build schedule: for each day, collect sessions that occur on that day
          const daySchedule: Map<string, Array<{ name: string; timeStart: string; timeEnd: string; duration: number; codes: string[] }>> = new Map();
          DAYS.forEach((d) => daySchedule.set(d.value, []));

          details.forEach((detail) => {
            const isEveryDay = detail.params_occurrence.some((o: CareOccurrence) => o.value === "*");
            const activeDays = isEveryDay
              ? DAYS.map((d) => d.value)
              : detail.params_occurrence.map((o: CareOccurrence) => o.value).filter((v) => v !== "x");
            const dur = calculateSessionDuration(detail.time_start, detail.time_end);
            const codes = detail.longtermcareitemquantity_set.map((item) => item.long_term_care_item.code);
            activeDays.forEach((dayVal) => {
              const list = daySchedule.get(dayVal);
              if (list) {
                list.push({
                  name: detail.name,
                  timeStart: formatTime(detail.time_start),
                  timeEnd: formatTime(detail.time_end),
                  duration: dur,
                  codes,
                });
              }
            });
          });

          // Sort each day's sessions by start time
          daySchedule.forEach((sessions) => sessions.sort((a, b) => a.timeStart.localeCompare(b.timeStart)));

          return (
            <Box sx={{ mb: 3, pageBreakInside: "avoid" }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, color: "#1976d2" }}>
                Planning Hebdomadaire
              </Typography>
              <Table size="small" sx={{ tableLayout: "fixed" }}>
                <TableHead>
                  <TableRow>
                    {DAYS.map((d) => (
                      <TableCell
                        key={d.value}
                        align="center"
                        sx={{
                          fontWeight: 700,
                          fontSize: "9pt",
                          padding: "6px 4px",
                          backgroundColor: d.value === "5" || d.value === "6" ? "#e8eaf6" : "#f0f4f8",
                          borderBottom: "2px solid #1976d2",
                          color: "#1976d2",
                          width: `${100 / 7}%`,
                        }}
                      >
                        {d.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow sx={{ verticalAlign: "top" }}>
                    {DAYS.map((d) => {
                      const sessions = daySchedule.get(d.value) || [];
                      const dayTotal = sessions.reduce((s, sess) => s + sess.duration, 0);
                      return (
                        <TableCell
                          key={d.value}
                          sx={{
                            padding: "4px",
                            borderBottom: "1px solid #e0e0e0",
                            backgroundColor: d.value === "5" || d.value === "6" ? "#f5f5ff" : "white",
                            verticalAlign: "top",
                          }}
                        >
                          {sessions.length === 0 ? (
                            <Typography variant="caption" color="text.disabled" sx={{ display: "block", textAlign: "center", py: 1 }}>
                              —
                            </Typography>
                          ) : (
                            <>
                              {sessions.map((sess, i) => (
                                <Box
                                  key={i}
                                  sx={{
                                    mb: 0.5,
                                    p: 0.5,
                                    backgroundColor: "#e3f2fd",
                                    borderRadius: 0.5,
                                    borderLeft: "3px solid #1976d2",
                                  }}
                                >
                                  <Typography sx={{ fontSize: "8pt", fontWeight: 600, lineHeight: 1.3 }}>
                                    {sess.timeStart}–{sess.timeEnd}
                                  </Typography>
                                  <Typography sx={{ fontSize: "7pt", color: "#555", lineHeight: 1.2 }}>
                                    {sess.name}
                                  </Typography>
                                  <Typography sx={{ fontSize: "7pt", color: "#888", lineHeight: 1.2 }}>
                                    {sess.codes.join(", ")} ({sess.duration} min)
                                  </Typography>
                                </Box>
                              ))}
                              <Typography sx={{ fontSize: "7pt", fontWeight: 600, textAlign: "center", color: "#1976d2", mt: 0.5 }}>
                                Total: {dayTotal} min
                              </Typography>
                            </>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          );
        })()}

        {/* Schedule Details */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, color: "#1976d2" }}>
          Programme de Soins
        </Typography>

        {details.map((detail, index) => {
          const daysPerWeek = calculateActualDaysPerWeek(detail.params_occurrence) || 1;
          const sessionDur = calculateSessionDuration(detail.time_start, detail.time_end);
          const occurrenceText = detail.params_occurrence
            .map((o: CareOccurrence) => o.str_name || o.value)
            .join(", ");

          return (
            <Box key={detail.id} sx={{ mb: 2.5, pageBreakInside: "avoid" }}>
              <Box sx={{
                backgroundColor: "#1976d2",
                color: "white",
                px: 1.5,
                py: 0.5,
                borderRadius: "4px 4px 0 0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <Typography sx={{ fontWeight: 600, fontSize: "11pt" }}>
                  {detail.name}
                </Typography>
                <Typography sx={{ fontSize: "10pt" }}>
                  {formatTime(detail.time_start)} — {formatTime(detail.time_end)} ({sessionDur} min)
                </Typography>
              </Box>

              <Box sx={{ border: "1px solid #e0e0e0", borderTop: "none", p: 1.5 }}>
                {occurrenceText && (
                  <Typography variant="body2" sx={{ mb: 1, color: "#666" }}>
                    <strong>Jours:</strong> {occurrenceText} ({daysPerWeek}x/sem.)
                  </Typography>
                )}

                {detail.care_actions && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Actions:</strong> {detail.care_actions}
                  </Typography>
                )}

                <Table size="small" sx={{ mt: 1 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headerCell}>Code</TableCell>
                      <TableCell sx={headerCell}>Description</TableCell>
                      <TableCell align="center" sx={headerCell}>Qty</TableCell>
                      <TableCell align="right" sx={headerCell}>Duree/passage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.longtermcareitemquantity_set.map((item, i) => {
                      const sd = (item.long_term_care_item as any).session_duration ||
                        (item.long_term_care_item.weekly_package || 0) / 7;
                      return (
                        <TableRow key={i}>
                          <TableCell sx={cell}>{item.long_term_care_item.code}</TableCell>
                          <TableCell sx={cell}>{item.long_term_care_item.description || "—"}</TableCell>
                          <TableCell align="center" sx={cell}>{item.quantity}</TableCell>
                          <TableCell align="right" sx={cell}>{Math.round(sd * item.quantity * 100) / 100} min</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          );
        })}

        {/* Summary */}
        <Box sx={{ pageBreakInside: "avoid", mt: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, color: "#1976d2" }}>
            Resume Hebdomadaire
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerCell}>Code</TableCell>
                <TableCell sx={headerCell}>Description</TableCell>
                <TableCell align="right" sx={headerCell}>Duree/passage</TableCell>
                <TableCell align="right" sx={headerCell}>Passages/sem.</TableCell>
                <TableCell align="right" sx={headerCell}>Consomme/sem.</TableCell>
                <TableCell align="right" sx={headerCell}>Forfait/sem.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from(codeStats.entries()).map(([code, stats]) => (
                <TableRow key={code}>
                  <TableCell sx={cell}>{code}</TableCell>
                  <TableCell sx={{ ...cell, fontSize: "9pt" }}>
                    {details
                      .flatMap((d) => d.longtermcareitemquantity_set)
                      .find((i) => i.long_term_care_item.code === code)
                      ?.long_term_care_item.description || "—"}
                  </TableCell>
                  <TableCell align="right" sx={cell}>
                    {Math.round(stats.sessionDur * 100) / 100} min
                  </TableCell>
                  <TableCell align="right" sx={cell}>{stats.totalOcc}</TableCell>
                  <TableCell align="right" sx={{ ...cell, fontWeight: 600 }}>
                    {Math.round(stats.sessionDur * stats.totalOcc * 100) / 100} min
                  </TableCell>
                  <TableCell align="right" sx={cell}>{stats.weeklyPkg} min</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ backgroundColor: "#f0f4f8" }}>
                <TableCell colSpan={4} sx={{ ...cell, fontWeight: 700 }}>TOTAL</TableCell>
                <TableCell align="right" sx={{ ...cell, fontWeight: 700 }}>
                  {Math.round(totalConsumed)} min
                </TableCell>
                <TableCell align="right" sx={{ ...cell, fontWeight: 700 }}>
                  {totalWeeklyPkg} min
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Monthly */}
          <Box sx={{ mt: 2, display: "flex", gap: 3 }}>
            {[28, 30, 31].map((days) => (
              <Box key={days} sx={{ textAlign: "center" }}>
                <Typography variant="caption" color="text.secondary">{days} jours</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {Math.round(totalSessionMinutes / 7 * days)} min
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Missing codes */}
        {missingCodes.length > 0 && (
          <Box sx={{ pageBreakInside: "avoid", mt: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: "#ed6c02" }}>
              Codes CNS non utilises ({missingCodes.length})
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...headerCell, backgroundColor: "#fff3e0", color: "#ed6c02", borderBottomColor: "#ed6c02" }}>Code</TableCell>
                  <TableCell sx={{ ...headerCell, backgroundColor: "#fff3e0", color: "#ed6c02", borderBottomColor: "#ed6c02" }}>Description</TableCell>
                  <TableCell align="center" sx={{ ...headerCell, backgroundColor: "#fff3e0", color: "#ed6c02", borderBottomColor: "#ed6c02" }}>Frequence</TableCell>
                  <TableCell align="right" sx={{ ...headerCell, backgroundColor: "#fff3e0", color: "#ed6c02", borderBottomColor: "#ed6c02" }}>Forfait/sem.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {missingCodes.map((mc, i) => (
                  <TableRow key={i}>
                    <TableCell sx={cell}>{mc.item?.code}</TableCell>
                    <TableCell sx={{ ...cell, fontSize: "9pt" }}>
                      {mc.custom_description || mc.item?.description || "—"}
                    </TableCell>
                    <TableCell align="center" sx={cell}>
                      {mc.number_of_care}/{mc.periodicity === "W" ? "sem." : mc.periodicity === "D" ? "jour" : mc.periodicity}
                    </TableCell>
                    <TableCell align="right" sx={cell}>{mc.item?.weekly_package || "—"} min</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Footer */}
        <Divider sx={{ mt: 4, mb: 2 }} />
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="caption" color="text.secondary">
            {branding?.company_name || ""} — Plan de soins n&deg;{record?.plan_number} — {patientName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {branding?.company_email || ""} | {formatDate(new Date().toISOString())}
          </Typography>
        </Box>
      </Box>
    );
  },
);

PrintContent.displayName = "PrintContent";

interface PrintButtonProps {
  record: any;
  patient: any;
  details: CarePlanDetail[];
}

export const CarePlanPrintButton: React.FC<PrintButtonProps> = ({
  record,
  patient,
  details,
}) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!record?.id) return;
    setDownloading(true);
    try {
      const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL || "";
      const { authenticatedFetch } = await import("../dataProvider");
      const response = await authenticatedFetch(`${apiUrl}/careplans/${record.id}/pdf`);
      if (!response.ok) throw new Error("PDF generation failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Clean up after a delay
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.error("Failed to download PDF:", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      variant="outlined"
      startIcon={<PdfIcon />}
      onClick={handleDownloadPdf}
      size="small"
      disabled={downloading}
      color="error"
    >
      {downloading ? "Génération..." : "PDF"}
    </Button>
  );
};

