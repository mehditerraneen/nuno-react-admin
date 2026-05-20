import {
  Show,
  SimpleShowLayout,
  TopToolbar,
  ListButton,
  EditButton,
  RecordContextProvider,
  useRecordContext,
} from "react-admin";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

import type { ReactNode } from "react";
import { WriteOnly } from "../auth/WriteOnly";

const FALL_RISK_COLOR: Record<string, "success" | "warning" | "error"> = {
  LOW: "success",
  MODERATE: "warning",
  HIGH: "error",
};

const FALL_RISK_LABEL: Record<string, string> = {
  LOW: "Faible",
  MODERATE: "Modéré",
  HIGH: "Élevé",
};

// ----- Generic helpers -----

const formatValue = (value: unknown): ReactNode => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") {
    return value ? (
      <CheckCircleIcon color="success" fontSize="small" />
    ) : (
      <CancelIcon color="disabled" fontSize="small" />
    );
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? "—" : value.join(", ");
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    // ISO date / datetime — render as locale date.
    try {
      return new Date(value).toLocaleDateString("fr-FR");
    } catch {
      return value;
    }
  }
  return String(value);
};

const Field = ({
  label,
  value,
  span = 6,
  multiline = false,
}: {
  label: string;
  value: unknown;
  span?: number;
  multiline?: boolean;
}) => (
  <Grid size={{ xs: 12, sm: span }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        whiteSpace: multiline ? "pre-wrap" : "normal",
        wordBreak: "break-word",
        minHeight: 22,
      }}
    >
      {formatValue(value)}
    </Typography>
  </Grid>
);

const Section = ({
  title,
  children,
  dense,
}: {
  title: string;
  children: ReactNode;
  dense?: boolean;
}) => (
  <Card variant="outlined" sx={{ mb: 2 }}>
    <CardContent sx={{ pb: dense ? 1 : 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        {children}
      </Grid>
    </CardContent>
  </Card>
);

// ----- Header (patient + KPIs) -----

const Header = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  const patient = r.patient || {};
  const completion = r.completion_percentage ?? 0;
  const completionColor: "error" | "warning" | "success" =
    completion < 40 ? "error" : completion < 75 ? "warning" : "success";

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {r.patient_name || "—"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {patient.code_sn ? `Matricule: ${patient.code_sn}` : null}
            {patient.address ? ` · ${patient.address}` : null}
            {patient.zipcode || patient.city
              ? ` · ${patient.zipcode || ""} ${patient.city || ""}`
              : null}
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Typography variant="caption" color="text.secondary">
            Complétude
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ flexGrow: 1 }}>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, completion))}
                color={completionColor}
              />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {Number(completion).toFixed(0)}%
            </Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Typography variant="caption" color="text.secondary">
            Risque de chute (Morse)
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {r.fall_risk_level ? (
              <Chip
                label={FALL_RISK_LABEL[r.fall_risk_level] || r.fall_risk_level}
                color={FALL_RISK_COLOR[r.fall_risk_level] || "default"}
                size="small"
              />
            ) : (
              <Chip label="—" size="small" variant="outlined" />
            )}
            <Typography variant="body2">
              Score: <strong>{r.fall_risk_score ?? "—"}</strong>
            </Typography>
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
};

// ----- Sections -----

const SectionIdentite = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  const p = r.patient || {};
  return (
    <Section title="Patient & identité">
      <Field label="Nom" value={p.name} span={4} />
      <Field label="Prénom" value={p.first_name} span={4} />
      <Field label="Matricule" value={p.code_sn} span={4} />
      <Field label="Sexe" value={p.gender} span={4} />
      <Field label="Téléphone" value={p.phone_number} span={4} />
      <Field label="Téléphone bis" value={p.additional_phone_number} span={4} />
      <Field label="Email" value={p.email_address} span={4} />
      <Field label="Adresse" value={p.address} span={8} />
      <Field label="Code postal" value={p.zipcode} span={3} />
      <Field label="Ville" value={p.city} span={5} />
      <Field label="Pays" value={p.country} span={4} />
      <Field label="Nationalité" value={r.nationality} span={4} />
      <Field label="Lieu de naissance" value={r.birth_place} span={4} />
      <Field label="État civil" value={r.civil_status} span={4} />
      <Field label="Date de sortie" value={p.date_of_exit} span={6} />
      <Field label="Date de décès" value={p.date_of_death} span={6} />
    </Section>
  );
};

const SectionContrat = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  return (
    <Section title="Contrat & prise en charge">
      <Field label="Premier contact" value={r.first_contact_date} span={4} />
      <Field label="Voie de premier contact" value={r.first_contact_way} span={4} />
      <Field label="Contrat signé le" value={r.contract_signed_date} span={4} />
      <Field label="Début contrat" value={r.contract_start_date} span={4} />
      <Field label="Fin contrat" value={r.contract_end_date} span={4} />
      <Field label="Soin urgent / préventif" value={r.urgent_or_preventive_care} span={4} />
      <Field label="Raison de la dépendance" value={r.reason_for_dependence} span={12} multiline />
      <Field label="Mots-clés bio" value={r.bio_highlights} span={12} multiline />
    </Section>
  );
};

const SectionLanguesDirectives = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  return (
    <Section title="Langues, directives & croyances">
      <Field label="Langues parlées" value={r.spoken_languages} span={6} />
      <Field label="Langues comprises" value={r.understand_languages} span={6} />
      <Field label="Croyances religieuses" value={r.religious_beliefs} span={6} />
      <Field label="Directives anticipées" value={r.anticipated_directives} span={3} />
      <Field
        label="Date directives anticipées"
        value={r.anticipated_directives_date}
        span={3}
      />
      <Field
        label="Régime de protection légale"
        value={r.legal_protection_regimes}
        span={6}
      />
      <Field
        label="Protecteur (nom & contact)"
        value={r.legal_protector_name_and_contact}
        span={6}
        multiline
      />
    </Section>
  );
};

const SectionContacts = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  const list = r.contact_persons || [];
  return (
    <Section title={`Personnes de contact (${list.length})`} dense>
      <Grid size={12}>
        {list.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucune personne de contact.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Priorité</TableCell>
                  <TableCell>Nom</TableCell>
                  <TableCell>Relation</TableCell>
                  <TableCell>Tél. privé</TableCell>
                  <TableCell>Tél. bureau</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Adresse</TableCell>
                  <TableCell>Réf.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.priority ?? "—"}</TableCell>
                    <TableCell>{c.contact_name}</TableCell>
                    <TableCell>{c.contact_relationship || "—"}</TableCell>
                    <TableCell>{c.contact_private_phone_nbr || "—"}</TableCell>
                    <TableCell>{c.contact_business_phone_nbr || "—"}</TableCell>
                    <TableCell>{c.contact_email || "—"}</TableCell>
                    <TableCell>{c.contact_address || "—"}</TableCell>
                    <TableCell>
                      {c.reference_person ? (
                        <CheckCircleIcon color="success" fontSize="small" />
                      ) : (
                        ""
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Grid>
    </Section>
  );
};

const SectionPhysicians = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  const list = r.assigned_physicians || [];
  return (
    <Section title={`Médecins traitants (${list.length})`} dense>
      <Grid size={12}>
        {list.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucun médecin assigné.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Médecin</TableCell>
                  <TableCell>Spécialité</TableCell>
                  <TableCell>Téléphone</TableCell>
                  <TableCell>Adresse</TableCell>
                  <TableCell>Principal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.physician_name || "—"}</TableCell>
                    <TableCell>{p.specialty || "—"}</TableCell>
                    <TableCell>{p.phone_number || "—"}</TableCell>
                    <TableCell>{p.address || "—"}</TableCell>
                    <TableCell>
                      {p.main_attending_physician ? (
                        <CheckCircleIcon color="success" fontSize="small" />
                      ) : (
                        ""
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Grid>
    </Section>
  );
};

const SectionStakeholders = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  const list = r.other_stakeholders || [];
  return (
    <Section title={`Autres intervenants (${list.length})`} dense>
      <Grid size={12}>
        {list.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucun.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Spécialité</TableCell>
                  <TableCell>Tél. privé</TableCell>
                  <TableCell>Tél. bureau</TableCell>
                  <TableCell>Email</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.contact_name}</TableCell>
                    <TableCell>{s.contact_pro_spec || "—"}</TableCell>
                    <TableCell>{s.contact_private_phone_nbr || "—"}</TableCell>
                    <TableCell>{s.contact_business_phone_nbr || "—"}</TableCell>
                    <TableCell>{s.contact_email || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Grid>
    </Section>
  );
};

const SectionInsurance = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  const list = r.insurance_decisions || [];
  return (
    <Section title={`Assurance dépendance (${list.length})`} dense>
      <Grid size={12}>
        {list.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucune décision enregistrée.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Évaluation</TableCell>
                  <TableCell>Accusé réception</TableCell>
                  <TableCell>Décision</TableCell>
                  <TableCell>Forfait</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.evaluation_date || "—"}</TableCell>
                    <TableCell>{d.ack_receipt_date || "—"}</TableCell>
                    <TableCell>{d.decision_date || "—"}</TableCell>
                    <TableCell>{d.rate_granted || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Grid>
    </Section>
  );
};

const SectionMedical = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  return (
    <Section title="Pathologies & antécédents">
      <Field label="Pathologies" value={r.pathologies} span={12} multiline />
      <Field label="Antécédents médicaux" value={r.medical_background} span={12} multiline />
      <Field label="Traitements" value={r.treatments} span={12} multiline />
      <Field label="Allergies" value={r.allergies} span={12} multiline />
      <Field label="Évaluation générale" value={r.general_evaluation} span={12} multiline />
      <Field label="Hôpital préféré" value={r.preferred_hospital} span={6} />
      <Field
        label="Emplacement dossier soins"
        value={r.health_care_dossier_location}
        span={6}
      />
      <Field label="Aidant informel" value={r.informal_caregiver} span={12} multiline />
    </Section>
  );
};

const SectionAids = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  return (
    <Section title="Aides techniques & prothèses">
      <Field label="Lit médicalisé" value={r.electrical_bed} span={3} />
      <Field label="Déambulateur" value={r.walking_frame} span={3} />
      <Field label="Canne" value={r.cane} span={3} />
      <Field label="Aqualift" value={r.aqualift} span={3} />
      <Field label="Téléalarme" value={r.remote_alarm} span={3} />
      <Field label="Lunettes" value={r.glasses} span={3} />
      <Field label="Prothèse dentaire" value={r.dental_prosthesis} span={3} />
      <Field label="Appareil auditif" value={r.hearing_aid} span={3} />
      <Field label="Autres aides techniques" value={r.other_technical_help} span={6} multiline />
      <Field label="Autres prothèses" value={r.other_prosthesis} span={6} multiline />
    </Section>
  );
};

const SectionMedication = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  return (
    <Section title="Gestion des médicaments">
      <Field label="Géré par" value={r.drugs_managed_by} span={4} />
      <Field label="Préparé par" value={r.drugs_prepared_by} span={4} />
      <Field label="Distribution" value={r.drugs_distribution} span={4} />
      <Field label="Commandes" value={r.drugs_ordering} span={4} />
      <Field label="Visites pharmacie" value={r.pharmacy_visits} span={4} />
      <Field label="Pharmacies préférées" value={r.preferred_pharmacies} span={4} multiline />
    </Section>
  );
};

const SectionFallRisk = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  return (
    <Section title="Évaluation du risque de chute (Morse)">
      <Field label="Score Morse" value={r.fall_risk_score} span={3} />
      <Field
        label="Niveau"
        value={
          r.fall_risk_level
            ? FALL_RISK_LABEL[r.fall_risk_level] || r.fall_risk_level
            : null
        }
        span={3}
      />
      <Field label="Date évaluation" value={r.fall_risk_assessment_date} span={3} />
      <Field label="Dernière chute" value={r.last_fall_date} span={3} />
      <Field label="Antécédents de chute" value={r.fall_history} span={4} />
      <Field label="Diagnostic secondaire" value={r.secondary_diagnosis} span={4} />
      <Field label="Aide ambulatoire" value={r.ambulatory_aid} span={4} />
      <Field label="Thérapie IV" value={r.iv_therapy} span={4} />
      <Field label="Démarche / transfert" value={r.gait_transfer} span={4} />
      <Field label="Statut mental" value={r.mental_status} span={4} />
      <Field
        label="Mesures de prévention"
        value={r.fall_prevention_measures}
        span={12}
        multiline
      />
    </Section>
  );
};

const SectionMobility = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  return (
    <Section title="Mobilité">
      <Field label="Mobilisation" value={r.mobilization} span={6} />
      <Field label="Latéralité" value={r.handedness} span={6} />
      <Field label="Description" value={r.mobilization_description} span={12} multiline />
    </Section>
  );
};

const SectionHygiene = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  return (
    <Section title="Hygiène">
      <Field label="Lieu des soins" value={r.hygiene_care_location} span={4} />
      <Field label="Jours douche" value={r.shower_days} span={4} />
      <Field label="Lavage cheveux" value={r.hair_wash_days} span={4} />
      <Field label="Gestion lit" value={r.bed_manager} span={4} />
      <Field label="Gestion draps" value={r.bed_sheets_manager} span={4} />
      <Field label="Gestion linge" value={r.laundry_manager} span={4} />
      <Field label="Dépôt linge" value={r.laundry_drop_location} span={4} />
      <Field label="Nouveau linge" value={r.new_laundry_location} span={4} />
      <Field
        label="Remarques générales"
        value={r.hygiene_general_remarks}
        span={12}
        multiline
      />
    </Section>
  );
};

const SectionNutrition = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  return (
    <Section title="Nutrition">
      <Field label="Poids (kg)" value={r.weight} span={3} />
      <Field label="Taille (cm)" value={r.size} span={3} />
      <Field label="Autonomie" value={r.nutrition_autonomy} span={3} />
      <Field label="Régime" value={r.diet} span={3} />
      <Field label="Repas livré" value={r.meal_on_wheels} span={3} />
      <Field label="Boissons préférées" value={r.preferred_drinks} span={9} />
      <Field
        label="Gestion courses"
        value={r.shopping_management}
        span={6}
      />
      <Field
        label="Description courses"
        value={r.shopping_management_desc}
        span={6}
        multiline
      />
    </Section>
  );
};

const SectionContinence = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  return (
    <Section title="Élimination">
      <Field label="Incontinence urinaire" value={r.urinary_incontinence} span={4} />
      <Field label="Incontinence fécale" value={r.faecal_incontinence} span={4} />
      <Field label="Protection" value={r.protection} span={4} />
      <Field label="Protection jour" value={r.day_protection} span={4} />
      <Field label="Protection nuit" value={r.night_protection} span={4} />
      <Field label="Protection commandée" value={r.protection_ordered} span={4} />
      <Field label="Sonde urinaire" value={r.urinary_catheter} span={4} />
      <Field label="Cystofix" value={r.crystofix_catheter} span={4} />
      <Field
        label="Détails complémentaires"
        value={r.elimination_addnl_details}
        span={12}
        multiline
      />
    </Section>
  );
};

const SectionHousing = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  return (
    <Section title="Logement & cadre de vie">
      <Field label="Type de logement" value={r.house_type} span={4} />
      <Field label="Étage" value={r.floor_number} span={4} />
      <Field label="Ascenseur" value={r.elevator} span={4} />
      <Field label="Clé / accès" value={r.door_key} span={4} />
      <Field label="N° clé" value={r.door_key_number} span={4} />
      <Field label="Porte d'entrée" value={r.entry_door} span={4} />
      <Field label="Animaux domestiques" value={r.domestic_animals} span={6} />
      <Field label="Cercle relationnel" value={r.ppl_circle} span={6} />
    </Section>
  );
};

const SectionActivities = () => {
  const r = useRecordContext<any>();
  if (!r) return null;
  return (
    <Section title="Activités & vie quotidienne">
      <Field label="Centre de jour" value={r.day_care_center} span={6} />
      <Field
        label="Activités centre de jour"
        value={r.day_care_center_activities}
        span={6}
      />
      <Field label="Tâches ménagères" value={r.household_chores} span={6} />
      <Field label="Aide ménage" value={r.help_for_cleaning} span={6} />
    </Section>
  );
};

// ----- Top-level Show -----

const Actions = () => (
  <TopToolbar>
    <ListButton />
    <WriteOnly>
      <EditButton />
    </WriteOnly>
  </TopToolbar>
);

const AnamnesisSectionsInner = ({
  showHeader = true,
}: {
  showHeader?: boolean;
}) => (
  <Box>
    {showHeader && <Header />}
    <SectionIdentite />
    <SectionContrat />
    <SectionLanguesDirectives />
    <SectionContacts />
    <SectionPhysicians />
    <SectionStakeholders />
    <SectionInsurance />
    <SectionMedical />
    <SectionAids />
    <SectionMedication />
    <SectionFallRisk />
    <SectionMobility />
    <SectionHygiene />
    <SectionNutrition />
    <SectionContinence />
    <SectionHousing />
    <SectionActivities />
  </Box>
);

/**
 * Renders the full anamnesis as sectioned cards. Supply `record` to use
 * outside a react-admin Show context (e.g. embedded in a patient page).
 * If `record` is null/undefined, renders an "Aucune anamnèse" empty state.
 */
export const AnamnesisSectionsView = ({
  record,
  showHeader = true,
}: {
  record: any | null | undefined;
  showHeader?: boolean;
}) => {
  if (!record) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: "center", mb: 2 }}>
        <Typography variant="body1" color="text.secondary">
          Aucune anamnèse enregistrée pour ce patient.
        </Typography>
      </Paper>
    );
  }
  return (
    <RecordContextProvider value={record}>
      <AnamnesisSectionsInner showHeader={showHeader} />
    </RecordContextProvider>
  );
};

const PatientAnamnesisLayout = () => (
  <SimpleShowLayout sx={{ "& .RaSimpleShowLayout-stack": { gap: 0 } }}>
    <AnamnesisSectionsInner />
  </SimpleShowLayout>
);

export const PatientAnamnesisShow = () => (
  <Show actions={<Actions />} title="Anamnèse">
    <PatientAnamnesisLayout />
  </Show>
);
