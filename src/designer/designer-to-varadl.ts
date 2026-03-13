import type { DesignerModel } from "./designer-types";

export function designerToVarADL(model: DesignerModel): string {
  const lines: string[] = [`architecture ${model.architectureName} {`, ""];

  for (const component of model.components) {
    const prefix = component.optional ? "optional component" : "component";

    if (component.ports.length === 0) {
      lines.push(`${prefix} ${component.name}`);
      continue;
    }

    lines.push(`${prefix} ${component.name} {`);
    for (const port of component.ports) {
      lines.push(`  port ${port.name}`);
    }
    lines.push("}");
    lines.push("");
  }

  for (const connector of model.connectors) {
    const source = model.components.find((c) => c.id === connector.sourceComponentId);
    const target = model.components.find((c) => c.id === connector.targetComponentId);

    if (!source || !target) continue;

    lines.push(
      `connect ${source.name}.${connector.sourcePortName} -> ${target.name}.${connector.targetPortName}`
    );
  }

  lines.push("}");
  return lines.join("\n");
}