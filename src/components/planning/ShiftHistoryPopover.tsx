import React, { useState, useEffect } from "react";
import {
  Popover,
  Box,
  Typography,
  CircularProgress,
  Chip,
  Divider,
  IconButton,
} from "@mui/material";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from "@mui/lab";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useDataProvider } from "react-admin";

interface ShiftChangeAudit {
  id: number;
  planning_id: number;
  employee_id: number;
  employee_name: string;
  employee_abbreviation: string;
  date: string;
  action: string;
  old_shift_code: string | null;
  old_hours: number | null;
  old_source: string | null;
  new_shift_code: string | null;
  new_hours: number | null;
  new_source: string | null;
  changed_by_id: number | null;
  changed_by_name: string | null;
  changed_at: string;
  change_reason: string;
  version: number;
}

interface CellHistoryResponse {
  employee_id: number;
  date: string;
  current_shift: {
    shift_type_id: number | null;
    shift_code: string;
    hours: number;
    notes: string;
    source: string;
  } | null;
  history: ShiftChangeAudit[];
  total_changes: number;
}

interface ShiftHistoryPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  planningId: number;
  employeeId: number;
  employeeName: string;
  date: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  CREATE: <AddIcon fontSize="small" />,
  UPDATE: <EditIcon fontSize="small" />,
  DELETE: <DeleteIcon fontSize="small" />,
};

const actionColors: Record<
  string,
  "success" | "primary" | "error" | "grey"
> = {
  CREATE: "success",
  UPDATE: "primary",
  DELETE: "error",
};

const actionLabels: Record<string, string> = {
  CREATE: "Ajouté",
  UPDATE: "Modifié",
  DELETE: "Supprimé",
};

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ShiftHistoryPopover: React.FC<ShiftHistoryPopoverProps> = ({
  anchorEl,
  onClose,
  planningId,
  employeeId,
  employeeName,
  date,
}) => {
  const dataProvider = useDataProvider();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CellHistoryResponse | null>(null);

  const open = Boolean(anchorEl);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);

      // @ts-expect-error Custom method
      dataProvider
        .getCellHistory(planningId, employeeId, date)
        .then((response: CellHistoryResponse) => {
          setData(response);
          setLoading(false);
        })
        .catch((err: Error) => {
          console.error("Failed to fetch cell history:", err);
          setError("Erreur lors du chargement de l'historique");
          setLoading(false);
        });
    }
  }, [open, planningId, employeeId, date, dataProvider]);

  const formattedDate = new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
      PaperProps={{
        sx: {
          maxWidth: 400,
          maxHeight: 500,
          overflow: "auto",
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontSize: "1rem" }}>
              Historique: {employeeName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formattedDate}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Loading state */}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {/* Error state */}
        {error && (
          <Typography color="error" sx={{ py: 2 }}>
            {error}
          </Typography>
        )}

        {/* Content */}
        {!loading && !error && data && (
          <>
            {/* Current shift */}
            {data.current_shift && (
              <Box sx={{ mb: 2, p: 1.5, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 0.5 }}
                >
                  Poste actuel
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    label={data.current_shift.shift_code}
                    size="small"
                    color="primary"
                  />
                  <Typography variant="body2">
                    {data.current_shift.hours}h
                  </Typography>
                </Box>
              </Box>
            )}

            {/* History timeline */}
            {data.history.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "center", py: 2 }}
              >
                Aucune modification enregistrée
              </Typography>
            ) : (
              <Timeline
                sx={{
                  p: 0,
                  m: 0,
                  "& .MuiTimelineItem-root:before": {
                    flex: 0,
                    padding: 0,
                  },
                }}
              >
                {data.history.map((item, index) => (
                  <TimelineItem key={item.id}>
                    <TimelineOppositeContent
                      sx={{
                        flex: 0.3,
                        py: 1,
                        px: 0.5,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.7rem" }}
                      >
                        {formatDateTime(item.changed_at)}
                      </Typography>
                    </TimelineOppositeContent>

                    <TimelineSeparator>
                      <TimelineDot
                        color={actionColors[item.action] || "grey"}
                        sx={{ p: 0.5 }}
                      >
                        {actionIcons[item.action]}
                      </TimelineDot>
                      {index < data.history.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>

                    <TimelineContent sx={{ py: 1, px: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {actionLabels[item.action] || item.action}
                      </Typography>

                      {/* Show change details */}
                      {item.action === "UPDATE" && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            mt: 0.5,
                          }}
                        >
                          <Chip
                            label={item.old_shift_code}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: "0.7rem", height: 20 }}
                          />
                          <Typography variant="caption">&rarr;</Typography>
                          <Chip
                            label={item.new_shift_code}
                            size="small"
                            color="primary"
                            sx={{ fontSize: "0.7rem", height: 20 }}
                          />
                        </Box>
                      )}

                      {item.action === "CREATE" && item.new_shift_code && (
                        <Chip
                          label={`${item.new_shift_code} (${item.new_hours}h)`}
                          size="small"
                          color="success"
                          sx={{ fontSize: "0.7rem", height: 20, mt: 0.5 }}
                        />
                      )}

                      {item.action === "DELETE" && item.old_shift_code && (
                        <Chip
                          label={`${item.old_shift_code} (${item.old_hours}h)`}
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ fontSize: "0.7rem", height: 20, mt: 0.5 }}
                        />
                      )}

                      {/* Changed by */}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.5 }}
                      >
                        par {item.changed_by_name || "Système"}
                      </Typography>

                      {/* Reason if provided */}
                      {item.change_reason && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            mt: 0.5,
                            fontStyle: "italic",
                            color: "text.secondary",
                          }}
                        >
                          "{item.change_reason}"
                        </Typography>
                      )}
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            )}

            {/* Total changes count */}
            {data.total_changes > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", textAlign: "center", mt: 1 }}
              >
                {data.total_changes} modification
                {data.total_changes > 1 ? "s" : ""} au total
              </Typography>
            )}
          </>
        )}
      </Box>
    </Popover>
  );
};

export default ShiftHistoryPopover;
