import type { Architecture } from "../model/varadl-types"

interface Props {
  architecture: Architecture
  selection?: Record<string,string[]>
}

export default function FeatureModelPanel({
  architecture,
  selection,
}: Props) {

  return (

    <div
      style={{
        marginBottom:20,
        border:"1px solid #ddd",
        padding:16,
        borderRadius:8,
      }}
    >

      <h2>Feature Model</h2>

      <div
        style={{
          fontWeight:700,
          marginBottom:10,
        }}
      >
        {architecture.name}
      </div>

      <ul>

        {architecture.variationPoints.map((vp)=>{

          return (

            <li
              key={vp.name}
              style={{marginBottom:10}}
            >

              <strong>
                {vp.name}
                {" "}
                <span style={{color:"#64748b"}}>
                  ({vp.type})
                </span>
              </strong>

              <ul>

                {vp.variants.map((variant)=>{

                  const selected =
                    selection?.[vp.name]?.includes(variant.name) ?? false

                  return (

                    <li
                      key={variant.name}
                      style={{
                        color:selected ? "#166534" : "#111827",
                        fontWeight:selected ? 700 : 400,
                      }}
                    >
                      {variant.name}
                    </li>

                  )

                })}

              </ul>

            </li>

          )

        })}

      </ul>

    </div>

  )

}