import { Admin, Resource } from "react-admin";
import { Layout } from "./Layout";
import { dataProvider } from "./dataProvider";
import { CarePlanList, CarePlanEdit, CarePlanCreate } from "./careplans";
import { CnsCarePlanList } from "./cnsCarePlans";
import { CnsCarePlanShow } from "./CnsCarePlanShow";
import { CarePlanShow } from "./CarePlanShow";

export const App = () => (
  <Admin layout={Layout} dataProvider={dataProvider}>
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
  </Admin>
);
