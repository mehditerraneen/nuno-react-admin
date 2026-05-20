import {
  Show,
  TopToolbar,
  ListButton,
  EditButton,
  useRecordContext,
  useGetList,
  useGetOne,
} from "react-admin";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import { WriteOnly } from "../auth/WriteOnly";
import { AnamnesisSectionsView } from "../patient-anamnesis";

const Actions = () => (
  <TopToolbar>
    <ListButton />
    <WriteOnly>
      <EditButton />
    </WriteOnly>
  </TopToolbar>
);

const PatientHeader = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  const fullName = `${r.first_name || ""} ${r.name || ""}`.trim() || "—";
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        {fullName}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {r.code_sn ? `Matricule: ${r.code_sn}` : null}
      </Typography>
      <Divider sx={{ my: 1.5 }} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Typography variant="caption" color="text.secondary">
            Adresse
          </Typography>
          <Typography variant="body2">
            {[r.address, r.zipcode, r.city, r.country]
              .filter(Boolean)
              .join(", ") || "—"}
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Typography variant="caption" color="text.secondary">
            Téléphone
          </Typography>
          <Typography variant="body2">
            {r.phone_number || "—"}
            {r.additional_phone_number ? ` · ${r.additional_phone_number}` : ""}
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Typography variant="caption" color="text.secondary">
            Email
          </Typography>
          <Typography variant="body2">{r.email_address || "—"}</Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Typography variant="caption" color="text.secondary">
            Genre
          </Typography>
          <Typography variant="body2">{r.gender || "—"}</Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Typography variant="caption" color="text.secondary">
            Date de sortie
          </Typography>
          <Typography variant="body2">
            {r.date_of_exit
              ? new Date(r.date_of_exit).toLocaleDateString("fr-FR")
              : "—"}
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Typography variant="caption" color="text.secondary">
            Date de décès
          </Typography>
          <Typography variant="body2">
            {r.date_of_death
              ? new Date(r.date_of_death).toLocaleDateString("fr-FR")
              : "—"}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

const AnamnesisBlock = () => {
  const patient = useRecordContext<any>();
  const { data, isLoading, error } = useGetList(
    "patient-anamnesis",
    {
      pagination: { page: 1, perPage: 1 },
      sort: { field: "updated_on", order: "DESC" },
      filter: { patient_id: patient?.id },
    },
    { enabled: !!patient?.id },
  );

  if (!patient) return null;

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="body2" color="error">
            Impossible de charger l'anamnèse : {String((error as Error).message || error)}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // The list endpoint returns slim records — re-fetch the full one if found.
  const summary = data?.[0];
  return <AnamnesisFullBlock anamnesisId={summary?.id} />;
};

const AnamnesisFullBlock = ({
  anamnesisId,
}: {
  anamnesisId: number | undefined;
}) => {
  // No anamnesis -> empty state.
  if (!anamnesisId) {
    return <AnamnesisSectionsView record={null} />;
  }
  return <AnamnesisFullFetcher id={anamnesisId} />;
};

const AnamnesisFullFetcher = ({ id }: { id: number }) => {
  const { data, isLoading, error } = useGetOne("patient-anamnesis", { id });
  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="body2" color="error">
            Erreur de chargement de l'anamnèse :{" "}
            {String((error as Error).message || error)}
          </Typography>
        </CardContent>
      </Card>
    );
  }
  return <AnamnesisSectionsView record={data} />;
};

const PatientShowLayout = () => (
  <Box sx={{ p: 1 }}>
    <PatientHeader />
    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
      Anamnèse
    </Typography>
    <AnamnesisBlock />
  </Box>
);

export const PatientShow = () => (
  <Show actions={<Actions />} title="Patient">
    <PatientShowLayout />
  </Show>
);
