{
  "mcpServers": {
    "dak-notebook":      { "command": "node", "args": ["mcp/dist/index.js", "--mode=notebook"] },
    "dak-data-agent-kit":{ "command": "node", "args": ["mcp/dist/index.js", "--mode=data-agent-kit"] },

    "dak-alloydb":  { "command": "node", "args": ["mcp/bin/mcp_proxy_bundle.cjs", "https://alloydb.googleapis.com/mcp"] },
    "dak-spark":    { "command": "node", "args": ["mcp/bin/mcp_proxy_bundle.cjs", "https://dataproc-${region}.googleapis.com/mcp"] },
    "dak-bigquery": { "command": "node", "args": ["mcp/bin/mcp_proxy_bundle.cjs", "https://bigquery.googleapis.com/mcp"] },
    "dak-bigtable-data": { ... },
    "dak-bigtable":  { ... },
    "dak-cloudsql":  { ... },
    "dak-gcs":       { ... },
    "dak-firestore": { ... },
    "dak-kc":        { ... },
    "dak-spanner":   { ... }
  }
}