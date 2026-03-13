export interface DesignerPort {
  id: string;
  name: string;
}

export interface DesignerComponent {
  id: string;
  name: string;
  optional: boolean;
  ports: DesignerPort[];
  x: number;
  y: number;
}

export interface DesignerConnector {
  id: string;
  sourceComponentId: string;
  sourcePortName: string;
  targetComponentId: string;
  targetPortName: string;
}

export interface DesignerModel {
  architectureName: string;
  components: DesignerComponent[];
  connectors: DesignerConnector[];
}