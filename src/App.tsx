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
import {
  EmployeeList,
  EmployeeEdit,
  EmployeeCreate,
} from "./components/tours/EmployeeManagement";

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
      list={ToursDashboard}
      options={{ label: "Tours Dashboard" }}
    />
    <CustomRoutes>
      <Route path="/tours-dashboard" element={<ToursDashboard />} />
    </CustomRoutes>
  </Admin>
);
