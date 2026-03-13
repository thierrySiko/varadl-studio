import type {
 Architecture,
 Configuration
} from "../model/varadl-types"

import { deriveProductArchitecture } from "../engine/derivation-engine"

export interface ConfigurationSpaceResult{

 total:number
 valid:number
 invalid:number

}

export function exploreConfigurationSpace(
 architecture:Architecture
):ConfigurationSpaceResult{

 const variationPoints = architecture.variationPoints

 const allSelections:Record<string,string[]>[] = []

 function generate(index:number,current:Record<string,string[]>){

  if(index === variationPoints.length){

   allSelections.push({...current})
   return

  }

  const vp = variationPoints[index]

  if(vp.type === "alternative"){

   for(const variant of vp.variants){

    current[vp.name] = [variant.name]

    generate(index+1,current)

   }

  }

  if(vp.type === "optional"){

   current[vp.name] = []
   generate(index+1,current)

   for(const variant of vp.variants){

    current[vp.name] = [variant.name]
    generate(index+1,current)

   }

  }

  if(vp.type === "or"){

   for(const variant of vp.variants){

    current[vp.name] = [variant.name]
    generate(index+1,current)

   }

  }

 }

 generate(0,{})

 let valid = 0
 let invalid = 0

 for(const selection of allSelections){

  const configuration:Configuration = {

   name:"Generated",
   selectedVariants:Object.entries(selection).map(([vp,v])=>({

    variationPoint:vp,
    variants:v

   })),
   flags:[]

  }

  const result = deriveProductArchitecture(
   architecture,
   configuration
  )

  if(result.product){

   valid++

  }
  else{

   invalid++

  }

 }

 return{

  total:allSelections.length,
  valid,
  invalid

 }

}