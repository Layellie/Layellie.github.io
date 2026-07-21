export function tailwindSourceScope(sources) {
  return {
    name: "layellie-tailwind-source-scope",
    enforce: "pre",
    transform(code, id) {
      const normalized = id.replaceAll("\\", "/").split("?", 1)[0];
      if (!normalized.endsWith("/src/index.css")) return null;
      const directives = sources.map((source) => `@source ${JSON.stringify(source)};`).join("\n");
      return code.replace('@import "tailwindcss";', `@import "tailwindcss" source(none);\n${directives}`);
    },
  };
}
