import { parseArchitecture, parseConfiguration } from "../parser/varadl-parser";
import { deriveProductArchitecture, productToText } from "../engine/derivation-engine";

const architectureSource = `
architecture WebApp {

component WebServer
optional component Cache
component Monitoring when LoggingFeature AND MetricsFeature

variationPoint DBType alternative {
    variant MySQL {
        component MySQLDatabase
    }
    variant PostgreSQL {
        component PostgreSQLDatabase
    }
}

variationPoint AuthType alternative {
    variant OAuth {
        component OAuthAuth
    }
    variant BasicAuth {
        component BasicAuthModule
    }
}

connect WebServer -> DBType
connect WebServer -> AuthType

constraint OAuthAuth requires HTTPS
}
`;

const configurationSource = `
configuration ProductA {
    select DBType = PostgreSQL
    select AuthType = OAuth
    include Cache
    include LoggingFeature
    include MetricsFeature
    include HTTPS
}
`;

const parsedArchitecture = parseArchitecture(architectureSource);
const parsedConfiguration = parseConfiguration(configurationSource);

if (parsedArchitecture.errors.length > 0) {
  console.error("Erreurs architecture:", parsedArchitecture.errors);
}

if (parsedConfiguration.errors.length > 0) {
  console.error("Erreurs configuration:", parsedConfiguration.errors);
}

if (parsedArchitecture.result && parsedConfiguration.result) {
  const result = deriveProductArchitecture(
    parsedArchitecture.result,
    parsedConfiguration.result,
  );

  if (result.errors.length > 0) {
    console.error("Erreurs de dérivation:", result.errors);
  } else if (result.product) {
    console.log(productToText(result.product));
  }
}