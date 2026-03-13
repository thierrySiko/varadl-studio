import type { Architecture } from "../model/varadl-types"

interface Props {
 architecture: Architecture
 activeComponents: Set<string>
}

export default function ConstraintPanel({architecture,activeComponents}:Props){

 const activeConstraints = []
 const violatedConstraints = []
 const inactiveConstraints = []

 for(const constraint of architecture.constraints){

  const sourceActive = activeComponents.has(constraint.source)
  const targetActive = activeComponents.has(constraint.target)

  if(constraint.type === "requires"){

   if(sourceActive && !targetActive){
    violatedConstraints.push(constraint)
   }
   else if(sourceActive && targetActive){
    activeConstraints.push(constraint)
   }
   else{
    inactiveConstraints.push(constraint)
   }

  }

  if(constraint.type === "excludes"){

   if(sourceActive && targetActive){
    violatedConstraints.push(constraint)
   }
   else if(sourceActive || targetActive){
    activeConstraints.push(constraint)
   }
   else{
    inactiveConstraints.push(constraint)
   }

  }

 }

 return (

  <div style={{
   marginBottom:20,
   border:"1px solid #ddd",
   padding:16,
   borderRadius:8
  }}>

   <h2>Analyse des contraintes</h2>

   <h3 style={{color:"#16a34a"}}>Contraintes satisfaites</h3>

   {activeConstraints.length === 0 && <div>Aucune</div>}

   {activeConstraints.map((c,i)=>(
    <div key={i}>
     {c.source} {c.type} {c.target}
    </div>
   ))}

   <h3 style={{color:"#dc2626",marginTop:15}}>Contraintes violées</h3>

   {violatedConstraints.length === 0 && <div>Aucune</div>}

   {violatedConstraints.map((c,i)=>(
    <div key={i}>
     {c.source} {c.type} {c.target}
    </div>
   ))}

   <h3 style={{color:"#64748b",marginTop:15}}>Contraintes inactives</h3>

   {inactiveConstraints.length === 0 && <div>Aucune</div>}

   {inactiveConstraints.map((c,i)=>(
    <div key={i}>
     {c.source} {c.type} {c.target}
    </div>
   ))}

  </div>
 )
}