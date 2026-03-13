import { exploreConfigurationSpace } from "../analysis/configuration-space"
import type { Architecture } from "../model/varadl-types"

interface Props{
 architecture:Architecture
}

export default function ConfigurationSpacePanel({architecture}:Props){

 const result = exploreConfigurationSpace(architecture)

 return(

  <div style={{
   marginBottom:20,
   border:"1px solid #ddd",
   padding:16,
   borderRadius:8
  }}>

   <h2>Analyse de l'espace de configuration</h2>

   <div>Total configurations : {result.total}</div>

   <div style={{color:"#16a34a"}}>
    Configurations valides : {result.valid}
   </div>

   <div style={{color:"#dc2626"}}>
    Configurations invalides : {result.invalid}
   </div>

  </div>

 )

}