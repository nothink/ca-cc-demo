/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-domain-to-infrastructure",
      severity: "error",
      comment:
        "domain は infrastructure の型・ライブラリに依存してはならない(Clean Architectureの境界)",
      from: { path: "^src/domain" },
      to: { path: "^src/infrastructure" },
    },
    {
      name: "no-usecase-to-infrastructure",
      severity: "error",
      comment:
        "usecase は infrastructure の型・ライブラリに依存してはならない(Repository interface経由でのみ接続する)",
      from: { path: "^src/usecase" },
      to: { path: "^src/infrastructure" },
    },
    {
      name: "no-domain-to-usecase",
      severity: "error",
      comment:
        "domain は usecase に依存してはならない(依存の向きは presentation/infrastructure → usecase → domain の一方向)",
      from: { path: "^src/domain" },
      to: { path: "^src/usecase" },
    },
    {
      name: "no-circular",
      severity: "error",
      comment: "循環依存を禁止する",
      from: {},
      to: { circular: true },
    },
  ],

  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsConfig: {
      fileName: "tsconfig.json",
    },
    tsPreCompilationDeps: true,
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/[^/]+",
      },
      // `pnpm exec depcruise src --config .dependency-cruiser.cjs --output-type dot | dot -T svg > docs/dependency-graph.svg`
      // でPhase1/Phase2それぞれの依存グラフをSVGとして出力し、形が変わっていないことを比較する
      archi: {
        collapsePattern:
          "^(src/domain|src/usecase|src/infrastructure/(prisma|drizzle)|src/presentation)/[^/]+",
      },
    },
  },
};
