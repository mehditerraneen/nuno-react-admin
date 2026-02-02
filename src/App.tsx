import { Admin, Resource, CustomRoutes } from "react-admin";
import { Route } from "react-router-dom";
import { Layout } from "./Layout";
import { dataProvider } from "./dataProvider";
import { authProvider } from "./authProvider";
import { LoginPage } from "./components/LoginPage";
import { CarePlanList, CarePlanEdit, CarePlanCreate } from "./careplans";
import { CnsCarePlanList } from "./cnsCarePlans";
import { CnsCarePlanShow } from "./CnsCarePlanShow";
import { CarePlanShow } from "./CarePlanShow";
import { EventList, EventEdit, EventCreate } from "./components/tours/Events";
import { ToursDashboard } from "./components/tours/ToursDashboard";
import { EnhancedToursDashboard } from "./components/tours/EnhancedToursDashboard";
import {
  TourList,
  TourEdit,
  TourCreate,
  TourShow,
} from "./components/tours/Tours";
import { EnhancedTourEdit } from "./components/tours/EnhancedTourEdit";
import {
  EmployeeList,
  EmployeeEdit,
  EmployeeCreate,
} from "./components/tours/EmployeeManagement";
import {
  MedicationPlanList,
  MedicationPlanEdit,
  MedicationPlanCreate,
  MedicationPlanShow,
} from "./components/medication-plans";
import {
  PrescriptionList,
  PrescriptionEdit,
  PrescriptionCreate,
  PrescriptionShow,
} from "./components/prescriptions";
import {
  PlanningList,
  PlanningShow,
  PlanningCreate,
  PlanningEdit,
} from "./planning-better";
import {
  PlanningFullCalendarList,
  PlanningFullCalendarShow,
  PlanningFullCalendarCreate,
  PlanningFullCalendarEdit,
} from "./planning-fullcalendar";
import PlanningAuditLogPage from "./components/planning/PlanningAuditLogPage";
import {
  WoundList,
  WoundEdit,
  WoundShow,
  WoundCreate,
} from "./components/wounds";

export const App = () => (
  <Admin
    layout={Layout}
    dataProvider={dataProvider}
    authProvider={authProvider}
    loginPage={LoginPage}
  >
    <Resource
      name="careplans"
      list={CarePlanList}
      edit={CarePlanEdit}
      create={CarePlanCreate}
      show={CarePlanShow}
      options={{ label: "Care Plans" }}
    />
    <Resource
      name="cnscareplans"
      list={CnsCarePlanList}
      show={CnsCarePlanShow}
      options={{ label: "CNS Care Plans" }}
    />
    <Resource name="patients_with_cns_plan" />
    <Resource
      name="patients"
      recordRepresentation={(record) =>
        `${record.name} ${record.first_name} (${record.code_sn})`
      }
    />
    <Resource name="careoccurrences" options={{ label: "Care Occurrences" }} />
    <Resource
      name="longtermcareitems"
      options={{ label: "Long Term Care Items" }}
    />
    <Resource name="event-types" />
    <Resource
      name="events"
      list={EventList}
      edit={EventEdit}
      create={EventCreate}
      options={{ label: "Events" }}
    />
    <Resource
      name="employees"
      list={EmployeeList}
      edit={EmployeeEdit}
      create={EmployeeCreate}
      options={{ label: "Employees" }}
    />
    <Resource
      name="tours"
      list={TourList}
      edit={EnhancedTourEdit}
      create={TourCreate}
      show={TourShow}
      options={{ label: "Tours" }}
    />
    <Resource
      name="medication-plans"
      list={MedicationPlanList}
      edit={MedicationPlanEdit}
      create={MedicationPlanCreate}
      show={MedicationPlanShow}
      options={{ label: "Medication Plans" }}
    />
    <Resource
      name="prescriptions"
      list={PrescriptionList}
      edit={PrescriptionEdit}
      create={PrescriptionCreate}
      show={PrescriptionShow}
      options={{ label: "Prescriptions" }}
    />
    <Resource
      name="planning/monthly-planning"
      list={PlanningList}
      show={PlanningShow}
      create={PlanningCreate}
      edit={PlanningEdit}
      options={{ label: "Planning" }}
    />
    <Resource
      name="planning-fc"
      list={PlanningFullCalendarList}
      show={PlanningFullCalendarShow}
      create={PlanningFullCalendarCreate}
      edit={PlanningFullCalendarEdit}
      options={{ label: "Planning (*)" }}
    />
    <Resource
      name="wounds"
      list={WoundList}
      edit={WoundEdit}
      create={WoundCreate}
      show={WoundShow}
      options={{ label: "Gestion des plaies" }}
    />
    <CustomRoutes>
      <Route path="/tours-dashboard" element={<EnhancedToursDashboard />} />
      <Route path="/planning/:id/audit-log" element={<PlanningAuditLogPage />} />
    </CustomRoutes>
  </Admin>
);
