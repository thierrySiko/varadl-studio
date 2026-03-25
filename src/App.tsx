import { useMemo, useState } from "react";
import ArchitectureEditor from "./components/ArchitectureEditor";
import ConfigEditor from "./components/ConfigEditor";
import ResultViewer from "./components/ResultViewer";
import VariabilityPanel from "./components/VariabilityPanel";
import ConstraintPanel from "./components/ConstraintPanel";
import ConfigurationSpacePanel from "./components/ConfigurationSpacePanel";
import GeneratedProductsPanel from "./components/GeneratedProductsPanel";
import GraphViewReactFlow from "./components/GraphViewReactFlow";
import FeatureModelPanel from "./components/FeatureModelPanel";
import FeatureModelGraph from "./components/FeatureModelGraph";
import SPLGraphView from "./components/SPLGraphView";

import { parseArchitecture, parseConfiguration } from "./parser/varadl-parser";
import { deriveProductArchitecture, productToText } from "./engine/derivation-engine";

import type {
  Architecture,
  ArchitecturalElement,
  Component,
  Configuration,
  ProductArchitecture,
} from "./model/varadl-types";

const sampleArchitecture = `architecture ConsumerCreditApp {

component LoanApplicationService {
  port customerOut
  port scoringOut
  port contractOut
  port notificationOut
}

component CustomerService {
  port customerIn
}

component ContractService {
  port contractIn
  port contractOut
}

component PaymentScheduleService {
  port scheduleIn
}

component NotificationService {
  port notificationIn
}

optional component InsuranceModule {
  port insuranceIn
}

variationPoint ScoringType alternative {

  variant InternalScoring {
    component InternalScoringEngine {
      port scoringIn
    }

    connect LoanApplicationService.scoringOut -> InternalScoringEngine.scoringIn
  }

  variant ExternalScoring {
    component ExternalScoringGateway {
      port scoringIn
    }

    connect LoanApplicationService.scoringOut -> ExternalScoringGateway.scoringIn
  }
}

variationPoint KYCType alternative {

  variant BasicKYC {
    component BasicKYCService {
      port kycIn
    }
  }

  variant AdvancedKYC {
    component AdvancedKYCService {
      port kycIn
    }

    component FraudDetectionService {
      port fraudIn
    }
  }
}

variationPoint SignatureType optional {

  variant ESignature {
    component ESignatureService {
      port signIn
    }

    connect ContractService.contractOut -> ESignatureService.signIn
  }
}

connect LoanApplicationService.customerOut -> CustomerService.customerIn
connect ContractService.contractIn -> PaymentScheduleService.scheduleIn
connect LoanApplicationService.notificationOut -> NotificationService.notificationIn

constraint FraudDetectionService requires AdvancedKYCService
constraint ESignatureService requires ContractService
}`;

const sampleConfiguration = `configuration PremiumLoan {

select ScoringType = ExternalScoring
select KYCType = AdvancedKYC
select SignatureType = ESignature
include InsuranceModule

}`;

function configurationToText(configuration: Configuration): string {
  const lines: string[] = [`configuration ${configuration.name} {`, ""];

  for (const selection of configuration.selectedVariants) {
    lines.push(
      `select ${selection.variationPoint} = ${selection.variants.join(", ")}`
    );
  }

  if (configuration.flags.length > 0) {
    lines.push("");

    for (const flag of configuration.flags) {
      lines.push(`include ${flag}`);
    }
  }

  lines.push("}");

  return lines.join("\n");
}

function isComponent(element: ArchitecturalElement): element is Component {
  return element.kind === "component";
}

export default function App() {
  const [architectureText, setArchitectureText] = useState(sampleArchitecture);
  const [configText, setConfigText] = useState(sampleConfiguration);

  const [architecture, setArchitecture] = useState<Architecture | null>(null);
  const [selection, setSelection] = useState<Record<string, string[]>>({});
  const [flags, setFlags] = useState<string[]>([]);

  const [baseResult, setBaseResult] = useState("");
  const [baseProduct, setBaseProduct] = useState<ProductArchitecture | null>(null);
  const [baseErrors, setBaseErrors] = useState<string[]>([]);

  const [loadedProduct, setLoadedProduct] = useState<ProductArchitecture | null>(null);

  function deriveFromText(): void {
    setLoadedProduct(null);

    const parsedArchitecture = parseArchitecture(architectureText);
    const parsedConfiguration = parseConfiguration(configText);

    const parseErrors = [
      ...parsedArchitecture.errors,
      ...parsedConfiguration.errors,
    ];

    if (
      parseErrors.length > 0 ||
      !parsedArchitecture.result ||
      !parsedConfiguration.result
    ) {
      setArchitecture(null);
      setBaseProduct(null);
      setBaseErrors(parseErrors.length > 0 ? parseErrors : ["Erreur de parsing."]);
      setBaseResult(parseErrors.join("\n"));
      return;
    }

    setArchitecture(parsedArchitecture.result);

    const selectionState: Record<string, string[]> = {};
    for (const s of parsedConfiguration.result.selectedVariants) {
      selectionState[s.variationPoint] = s.variants;
    }

    setSelection(selectionState);
    setFlags(parsedConfiguration.result.flags);

    const derivation = deriveProductArchitecture(
      parsedArchitecture.result,
      parsedConfiguration.result
    );

    if (derivation.errors.length > 0 || !derivation.product) {
      setBaseProduct(null);
      setBaseErrors(derivation.errors);
      setBaseResult(derivation.errors.join("\n"));
      return;
    }

    setBaseErrors([]);
    setBaseProduct(derivation.product);
    setBaseResult(productToText(derivation.product));
  }

  const interactiveConfiguration = useMemo<Configuration | null>(() => {
    if (!architecture) return null;

    return {
      name: "InteractiveProduct",
      selectedVariants: Object.entries(selection).map(
        ([variationPoint, variants]) => ({
          variationPoint,
          variants,
        })
      ),
      flags,
    };
  }, [architecture, selection, flags]);

  const interactiveDerivation = useMemo(() => {
    if (!architecture || !interactiveConfiguration) return null;

    return deriveProductArchitecture(architecture, interactiveConfiguration);
  }, [architecture, interactiveConfiguration]);

  const displayedConfigText = useMemo(() => {
    if (loadedProduct) {
      return configText;
    }

    if (!interactiveConfiguration) return configText;
    return configurationToText(interactiveConfiguration);
  }, [loadedProduct, interactiveConfiguration, configText]);

  const displayedProduct = useMemo(() => {
    if (loadedProduct) return loadedProduct;

    if (!interactiveDerivation) return baseProduct;
    if (interactiveDerivation.errors.length > 0) return null;

    return interactiveDerivation.product ?? null;
  }, [loadedProduct, interactiveDerivation, baseProduct]);

  const displayedErrors = useMemo(() => {
    if (!interactiveDerivation) return baseErrors;
    return interactiveDerivation.errors;
  }, [interactiveDerivation, baseErrors]);

  const displayedResult = useMemo(() => {
    if (loadedProduct) return productToText(loadedProduct);

    if (!interactiveDerivation) return baseResult;

    if (interactiveDerivation.errors.length > 0 || !interactiveDerivation.product) {
      return interactiveDerivation.errors.join("\n");
    }

    return productToText(interactiveDerivation.product);
  }, [loadedProduct, interactiveDerivation, baseResult]);

  function onSelectOne(vp: string, variant: string) {
    setLoadedProduct(null);

    setSelection((prev) => ({
      ...prev,
      [vp]: variant ? [variant] : [],
    }));
  }

  function onToggleMany(vp: string, variant: string) {
    setLoadedProduct(null);

    setSelection((prev) => {
      const current = prev[vp] ?? [];
      const exists = current.includes(variant);

      return {
        ...prev,
        [vp]: exists
          ? current.filter((v) => v !== variant)
          : [...current, variant],
      };
    });
  }

  function toggleFlag(flag: string) {
    setLoadedProduct(null);

    setFlags((prev) =>
      prev.includes(flag)
        ? prev.filter((f) => f !== flag)
        : [...prev, flag]
    );
  }

  function loadGeneratedProduct(
    product: ProductArchitecture,
    configuration: Configuration
  ) {
    setLoadedProduct(product);

    const selectionState: Record<string, string[]> = {};
    configuration.selectedVariants.forEach((selection) => {
      selectionState[selection.variationPoint] = selection.variants;
    });

    setSelection(selectionState);
    setFlags(configuration.flags);
    setConfigText(configurationToText(configuration));
  }

  const optionalComponents = useMemo(() => {
    if (!architecture) return [];

    return architecture.elements
      .filter(isComponent)
      .filter((component) => !!component.optional)
      .map((component) => component.name);
  }, [architecture]);

  const activeComponents = useMemo(() => {
    return new Set(
      displayedProduct?.elements
        .filter(isComponent)
        .map((component) => component.name) ?? []
    );
  }, [displayedProduct]);

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1>VarADL Studio</h1>

      <p>
        Prototype d&apos;ADL intégrant la variabilité des SPL avec composants,
        ports, connecteurs typés, fragments architecturaux, contraintes,
        sélection interactive, analyse de l&apos;espace de configuration
        et génération de toutes les architectures.
      </p>

      <ArchitectureEditor
        value={architectureText}
        onChange={setArchitectureText}
      />

      <ConfigEditor
        value={displayedConfigText}
        onChange={setConfigText}
      />

      <button
        onClick={deriveFromText}
        style={{
          marginBottom: 20,
          padding: "10px 16px",
          cursor: "pointer",
        }}
      >
        Charger architecture et configuration
      </button>

      {architecture && (
        <>
          <VariabilityPanel
            variationPoints={architecture.variationPoints}
            selection={selection}
            onSelectOne={onSelectOne}
            onToggleMany={onToggleMany}
          />

          <FeatureModelPanel
            architecture={architecture}
            selection={selection}
          />

          <FeatureModelGraph
            architecture={architecture}
            selection={selection}
          />

          <SPLGraphView
            architecture={architecture}
            selection={selection}
          />

          {optionalComponents.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h2>Options</h2>

              {optionalComponents.map((flag) => (
                <label key={flag} style={{ display: "block", marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={flags.includes(flag)}
                    onChange={() => toggleFlag(flag)}
                  />{" "}
                  {flag}
                </label>
              ))}
            </div>
          )}
        </>
      )}

      {displayedErrors.length > 0 && (
        <div
          style={{
            marginBottom: 20,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            padding: 12,
            borderRadius: 8,
            color: "#991b1b",
          }}
        >
          <strong>Erreurs</strong>
          <ul>
            {displayedErrors.map((error, index) => (
              <li key={`${error}-${index}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <ResultViewer result={displayedResult} />

      {architecture && displayedProduct && (
        <ConstraintPanel
          architecture={architecture}
          activeComponents={activeComponents}
        />
      )}

      {architecture && displayedProduct && (
        <div style={{ marginBottom: 20 }}>
          <h2>Architecture produit dérivée</h2>
          <GraphViewReactFlow
            productElements={displayedProduct.elements}
            architecture={architecture}
          />
        </div>
      )}

      {architecture && <ConfigurationSpacePanel architecture={architecture} />}

      {architecture && (
        <GeneratedProductsPanel
          architecture={architecture}
          onLoadProduct={loadGeneratedProduct}
        />
      )}

    </div>
  );
}