export type ConditionAst =
  | { type: "id"; value: string }
  | { type: "eq"; left: string; right: string }
  | { type: "not"; expr: ConditionAst }
  | { type: "and"; left: ConditionAst; right: ConditionAst }
  | { type: "or"; left: ConditionAst; right: ConditionAst };

export interface ConditionContext {
  flags: Set<string>;
  selectedVariantsByVp: Map<string, string[]>;
  selectedVariantNames: Set<string>;
  existingElements: Set<string>;
}

function tokenizeCondition(input: string): string[] {
  return input
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .replace(/==/g, " == ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function parseCondition(input: string): ConditionAst {
  const tokens = tokenizeCondition(input);
  let index = 0;

  const peek = () => tokens[index];

  const consume = (expected?: string): string => {
    const token = tokens[index];
    if (!token) {
      throw new Error("Expression logique incomplète.");
    }
    if (expected && token !== expected) {
      throw new Error(`Jeton attendu: ${expected}, trouvé: ${token}`);
    }
    index += 1;
    return token;
  };

  function parsePrimary(): ConditionAst {
    const token = peek();
    if (!token) {
      throw new Error("Expression logique incomplète.");
    }

    if (token === "(") {
      consume("(");
      const expr = parseOr();
      consume(")");
      return expr;
    }

    if (token === "NOT") {
      consume("NOT");
      return { type: "not", expr: parsePrimary() };
    }

    const left = consume();
    if (peek() === "==") {
      consume("==");
      const right = consume();
      return { type: "eq", left, right };
    }

    return { type: "id", value: left };
  }

  function parseAnd(): ConditionAst {
    let left = parsePrimary();
    while (peek() === "AND") {
      consume("AND");
      const right = parsePrimary();
      left = { type: "and", left, right };
    }
    return left;
  }

  function parseOr(): ConditionAst {
    let left = parseAnd();
    while (peek() === "OR") {
      consume("OR");
      const right = parseAnd();
      left = { type: "or", left, right };
    }
    return left;
  }

  const ast = parseOr();

  if (index < tokens.length) {
    throw new Error(`Jetons non consommés: ${tokens.slice(index).join(" ")}`);
  }

  return ast;
}

export function evaluateCondition(ast: ConditionAst, ctx: ConditionContext): boolean {
  switch (ast.type) {
    case "id":
      return (
        ctx.flags.has(ast.value) ||
        ctx.selectedVariantNames.has(ast.value) ||
        ctx.existingElements.has(ast.value)
      );

    case "eq": {
      const selected = ctx.selectedVariantsByVp.get(ast.left) ?? [];
      return selected.includes(ast.right);
    }

    case "not":
      return !evaluateCondition(ast.expr, ctx);

    case "and":
      return evaluateCondition(ast.left, ctx) && evaluateCondition(ast.right, ctx);

    case "or":
      return evaluateCondition(ast.left, ctx) || evaluateCondition(ast.right, ctx);
  }
}