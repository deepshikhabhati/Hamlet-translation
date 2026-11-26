# Heidi assistant backend

The Angular app (GitHub Pages) never contains an API key. "Ask Assistant AI" posts the passage context to this small
server, which holds `ANTHROPIC_API_KEY` and calls the model.

```bash
ANTHROPIC_API_KEY=sk-... ALLOWED_ORIGIN=https://deepshikhabhati.github.io PORT=8787 node server.mjs
```

Deploy it behind HTTPS (any Node host), then set `endpoint` in `src/assets/config/heidi-assistant.json`, e.g.
`"endpoint": "https://assistant.example.org/heidi-assistant"`, rebuild and redeploy. Until then the drawer shows
"Assistant unavailable" and generates nothing.
