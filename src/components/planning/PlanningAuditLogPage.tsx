import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDataProvider, useNotify } from "react-admin";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import EditNoteIcon from "@mui/icons-material/EditNote";

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

interface AuditLogResponse {
  planning_id: number;
  planning_name: string;
  changes: ShiftChangeAudit[];
  total: number;
  page: number;
  page_size: number;
}

const actionIcons: Record<string, React.ReactNode> = {
  CREATE: <AddIcon fontSize="small" color="success" />,
  UPDATE: <EditIcon fontSize="small" color="primary" />,
  DELETE: <DeleteIcon fontSize="small" color="error" />,
};

const actionLabels: Record<string, string> = {
  CREATE: "Ajouté",
  UPDATE: "Modifié",
  DELETE: "Supprimé",
};

const actionColors: Record<
  string,
  "success" | "primary" | "error" | "default"
> = {
  CREATE: "success",
  UPDATE: "primary",
  DELETE: "error",
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

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

const PlanningAuditLogPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const planningId = parseInt(id || "0", 10);
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filters
  const [filterEmployee, setFilterEmployee] = useState<string>("");
  const [filterAction, setFilterAction] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Edit reason dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAudit, setEditingAudit] = useState<ShiftChangeAudit | null>(null);
  const [editReason, setEditReason] = useState<string>("");
  const [savingReason, setSavingReason] = useState(false);

  const loadData = useCallback(async () => {
    if (!planningId) return;

    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page: page + 1,
        pageSize: rowsPerPage,
      };

      if (filterAction) params.action = filterAction;
      if (filterDateFrom) params.dateFrom = filterDateFrom;
      if (filterDateTo) params.dateTo = filterDateTo;

      // @ts-expect-error Custom method
      const response = await dataProvider.getPlanningAuditLog(
        planningId,
        params
      );
      setData(response);
    } catch (error) {
      console.error("Failed to load audit log:", error);
      notify("Erreur lors du chargement de l'historique", { type: "error" });
    } finally {
      setLoading(false);
    }
  }, [
    planningId,
    page,
    rowsPerPage,
    filterAction,
    filterDateFrom,
    filterDateTo,
    dataProvider,
    notify,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const clearFilters = () => {
    setFilterEmployee("");
    setFilterAction("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setPage(0);
  };

  const handleOpenEditDialog = (audit: ShiftChangeAudit) => {
    setEditingAudit(audit);
    setEditReason(audit.change_reason || "");
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingAudit(null);
    setEditReason("");
  };

  const handleSaveReason = async () => {
    if (!editingAudit) return;

    setSavingReason(true);
    try {
      // @ts-expect-error Custom method
      await dataProvider.updateAuditReason(editingAudit.id, editReason);

      // Update local data
      if (data) {
        setData({
          ...data,
          changes: data.changes.map((change) =>
            change.id === editingAudit.id
              ? { ...change, change_reason: editReason }
              : change
          ),
        });
      }

      notify("Raison mise à jour avec succès", { type: "success" });
      handleCloseEditDialog();
    } catch (error) {
      console.error("Failed to update reason:", error);
      notify("Erreur lors de la mise à jour de la raison", { type: "error" });
    } finally {
      setSavingReason(false);
    }
  };

  const exportToCsv = () => {
    if (!data) return;

    const headers = [
      "Date/Heure",
      "Employé",
      "Date du poste",
      "Action",
      "Ancien poste",
      "Nouveau poste",
      "Modifié par",
      "Raison",
    ];

    const rows = data.changes.map((change) => [
      formatDateTime(change.changed_at),
      `${change.employee_abbreviation} - ${change.employee_name}`,
      formatDate(change.date),
      actionLabels[change.action] || change.action,
      change.old_shift_code
        ? `${change.old_shift_code} (${change.old_hours}h)`
        : "-",
      change.new_shift_code
        ? `${change.new_shift_code} (${change.new_hours}h)`
        : "-",
      change.changed_by_name || "Système",
      change.change_reason || "-",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `historique_planning_${planningId}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notify("Export CSV téléchargé", { type: "success" });
  };

  const filteredChanges = data?.changes.filter((change) => {
    if (
      filterEmployee &&
      !change.employee_name
        .toLowerCase()
        .includes(filterEmployee.toLowerCase()) &&
      !change.employee_abbreviation
        .toLowerCase()
        .includes(filterEmployee.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5">
              Historique des modifications
            </Typography>
            {data && (
              <Typography variant="body2" color="text.secondary">
                {data.planning_name} - {data.total} modification
                {data.total > 1 ? "s" : ""}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Rafraîchir">
            <IconButton onClick={loadData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Afficher/Masquer les filtres">
            <IconButton onClick={() => setShowFilters(!showFilters)}>
              <FilterListIcon color={showFilters ? "primary" : "inherit"} />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportToCsv}
            disabled={!data || data.changes.length === 0}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      {showFilters && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Rechercher employé"
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Action</InputLabel>
                  <Select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    label="Action"
                  >
                    <MenuItem value="">Toutes</MenuItem>
                    <MenuItem value="CREATE">Ajouté</MenuItem>
                    <MenuItem value="UPDATE">Modifié</MenuItem>
                    <MenuItem value="DELETE">Supprimé</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Date du"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Date au"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={() => {
                      setPage(0);
                      loadData();
                    }}
                  >
                    Appliquer
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={clearFilters}
                  >
                    Effacer
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box
              sx={{ display: "flex", justifyContent: "center", py: 4 }}
            >
              <CircularProgress />
            </Box>
          ) : !data || (filteredChanges && filteredChanges.length === 0) ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary">
                Aucune modification enregistrée
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>
                        Date/Heure
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        Employé
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        Date poste
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        Ancien
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        Nouveau
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        Modifié par
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Raison</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredChanges?.map((change) => (
                      <TableRow
                        key={change.id}
                        sx={{
                          "&:hover": {
                            backgroundColor: "action.hover",
                          },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2">
                            {formatDateTime(change.changed_at)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500 }}
                            >
                              {change.employee_abbreviation}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {change.employee_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(change.date)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={actionIcons[change.action] as React.ReactElement}
                            label={actionLabels[change.action] || change.action}
                            size="small"
                            color={actionColors[change.action] || "default"}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {change.old_shift_code ? (
                            <Chip
                              label={`${change.old_shift_code} (${change.old_hours}h)`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: "0.75rem" }}
                            />
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {change.new_shift_code ? (
                            <Chip
                              label={`${change.new_shift_code} (${change.new_hours}h)`}
                              size="small"
                              color="primary"
                              sx={{ fontSize: "0.75rem" }}
                            />
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {change.changed_by_name || "Système"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            {change.change_reason ? (
                              <Tooltip title={change.change_reason}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    maxWidth: 120,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {change.change_reason}
                                </Typography>
                              </Tooltip>
                            ) : (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                -
                              </Typography>
                            )}
                            <Tooltip title="Modifier la raison">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEditDialog(change)}
                                sx={{ ml: "auto", opacity: 0.6, "&:hover": { opacity: 1 } }}
                              >
                                <EditNoteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={data.total}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage="Lignes par page:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} sur ${count}`
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Reason Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Modifier la raison du changement
        </DialogTitle>
        <DialogContent>
          {editingAudit && (
            <Box sx={{ mb: 2, mt: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Modification de <strong>{editingAudit.employee_abbreviation}</strong> le{" "}
                {formatDate(editingAudit.date)} ({actionLabels[editingAudit.action]})
              </Typography>
            </Box>
          )}
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Raison"
            placeholder="Ex: Demande de l'employé, Changement US, Maladie..."
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            variant="outlined"
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Suggestions: Demande employé, Changement US, Maladie, Formation, Congé exceptionnel
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} disabled={savingReason}>
            Annuler
          </Button>
          <Button
            onClick={handleSaveReason}
            variant="contained"
            disabled={savingReason}
          >
            {savingReason ? <CircularProgress size={20} /> : "Enregistrer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlanningAuditLogPage;
