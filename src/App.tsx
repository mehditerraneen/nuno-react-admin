import { Admin, Resource, CustomRoutes } from "react-admin";
import { Route } from "react-router-dom";
import { Layout } from "./Layout";
import { dataProvider } from "./dataProvider";
import { authProvider } from "./authProvider";
import { i18nProvider } from "./i18n";
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
  TourTypeList,
  TourTypeEdit,
  TourTypeCreate,
} from "./components/tours/TourTypeManagement";
import {
  ShiftTypeList,
  ShiftTypeEdit,
  ShiftTypeCreate,
} from "./components/tours/ShiftTypeManagement";
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
  PlanningAgGridList,
  PlanningAgGridShow,
  PlanningAgGridCreate,
  PlanningAgGridEdit,
} from "./planning-aggrid";
import PlanningAuditLogPage from "./components/planning/PlanningAuditLogPage";
import { StickyTest } from "./StickyTest";
import { StickyTestAgGrid } from "./StickyTestAgGrid";
import {
  WoundList,
  WoundEdit,
  WoundShow,
  WoundCreate,
} from "./components/wounds";
import SessionManager from "./components/SessionManager";
import { CarePlanOverlapView } from "./components/CarePlanOverlapView";

const AppLayout = (props: any) => (
  <>
    <Layout {...props} />
    <SessionManager />
  </>
);

export const App = () => (
  <Admin
    layout={AppLayout}
    dataProvider={dataProvider}
    authProvider={authProvider}
    i18nProvider={i18nProvider}
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
    <Resource
      name="patients_with_cns_plan"
      recordRepresentation={(record) =>
        `${record.name} ${record.first_name} (${record.code_sn})`
      }
    />
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
      name="tour-types"
      list={TourTypeList}
      edit={TourTypeEdit}
      create={TourTypeCreate}
      options={{ label: "Tour Types" }}
    />
    <Resource
      name="shift-types"
      list={ShiftTypeList}
      edit={ShiftTypeEdit}
      create={ShiftTypeCreate}
      options={{ label: "Shift Types" }}
    />
    <Resource name="long-term-packages" />
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
      list={PlanningAgGridList}
      show={PlanningAgGridShow}
      create={PlanningAgGridCreate}
      edit={PlanningAgGridEdit}
      options={{ label: "Planning (AG Grid)" }}
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
      <Route path="/careplan-overlaps" element={<CarePlanOverlapView />} />
      <Route path="/planning/:id/audit-log" element={<PlanningAuditLogPage />} />
      <Route path="/sticky-test" element={<StickyTest />} />
      <Route path="/ag-grid-test" element={<StickyTestAgGrid />} />
    </CustomRoutes>
  </Admin>
);
