#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# EKYAN WhatsApp Flows Manager
# Manages all 3 EKYAN flows against the Meta Graph API from the terminal.
#
# USAGE:
#   ./scripts/flows_manager.sh <command> [args]
#
# COMMANDS:
#   setup               — print setup instructions & check dependencies
#   validate            — validate all flow JSONs locally (no token needed)
#   create  <type>      — create a flow on Meta (returns flow_id)
#   upload  <flow_id> <type>  — upload/update flow JSON to an existing flow
#   publish <flow_id>   — publish a flow (makes it live)
#   list                — list all flows in your WABA
#   get     <flow_id>   — get details of a specific flow
#   deprecate <flow_id> — deprecate a published flow
#   delete  <flow_id>   — delete a draft flow
#   send    <phone> <type> <flow_id>  — send a flow trigger message to a phone
#   preview <type>      — open the Meta Flows Playground in browser
#   all                 — create + upload + publish all 3 flows in sequence
#
# FLOW TYPES:  credit_prequalification | blocker_report | harvest_registration
#
# SETUP:
#   Copy .env.flows.example to .env.flows and fill in your values, OR
#   export the vars directly before running:
#     export WA_TOKEN=<your_token>
#     export WABA_ID=<your_waba_id>
#     export WA_PHONE_ID=<your_phone_number_id>
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env.flows"
API_BASE="${EKYAN_API_URL:-http://localhost:8000}"
GRAPH_API="https://graph.facebook.com/v19.0"
TMP_DIR="/tmp/ekyan_flows"
mkdir -p "$TMP_DIR"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}ℹ ${NC}$*"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠️  $*${NC}"; }
error()   { echo -e "${RED}❌ $*${NC}"; exit 1; }
header()  { echo -e "\n${BOLD}${BLUE}── $* ──${NC}"; }

# ── Load env ──────────────────────────────────────────────────────────────────
load_env() {
  if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    set -a; source "$ENV_FILE"; set +a
    info "Loaded $ENV_FILE"
  fi
  WA_TOKEN="${WA_TOKEN:-}"
  WABA_ID="${WABA_ID:-}"
  WA_PHONE_ID="${WA_PHONE_ID:-}"
}

require_token() {
  [[ -n "$WA_TOKEN" ]]  || error "WA_TOKEN not set. See: ./flows_manager.sh setup"
  [[ -n "$WABA_ID" ]]   || error "WABA_ID not set. See: ./flows_manager.sh setup"
}

require_phone_id() {
  [[ -n "$WA_PHONE_ID" ]] || error "WA_PHONE_ID not set. See: ./flows_manager.sh setup"
}

# ── Flow metadata ─────────────────────────────────────────────────────────────
flow_name() {
  case "$1" in
    credit_prequalification) echo "EKYAN Credit Pre-Qualification" ;;
    blocker_report)          echo "EKYAN Blocker Report" ;;
    harvest_registration)    echo "EKYAN Harvest Registration" ;;
    *) error "Unknown flow type: $1. Use: credit_prequalification | blocker_report | harvest_registration" ;;
  esac
}

flow_category() {
  case "$1" in
    credit_prequalification) echo "SIGN_UP" ;;
    blocker_report)          echo "CUSTOMER_SUPPORT" ;;
    harvest_registration)    echo "LEAD_GENERATION" ;;
  esac
}

# ── Fetch flow JSON from running API ──────────────────────────────────────────
fetch_flow_json() {
  local flow_type="$1"
  local out_file="$TMP_DIR/${flow_type}.json"

  info "Fetching flow JSON from $API_BASE ..."
  local http_code
  http_code=$(curl -s -o "$out_file" -w "%{http_code}" \
    "$API_BASE/agronomist/api/v1/flows/definitions")

  if [[ "$http_code" != "200" ]]; then
    error "Could not reach API at $API_BASE (HTTP $http_code). Is FastAPI running?\n  cd src && uvicorn main:app --reload --port 8000"
  fi

  # Extract just the requested flow type
  local single_file="$TMP_DIR/${flow_type}_single.json"
  if command -v jq &>/dev/null; then
    jq ".${flow_type}" "$out_file" > "$single_file"
  else
    # fallback: python3
    python3 -c "
import json, sys
data = json.load(open('$out_file'))
print(json.dumps(data['$flow_type'], indent=2))
" > "$single_file"
  fi

  echo "$single_file"
}

# ── Commands ──────────────────────────────────────────────────────────────────

cmd_setup() {
  header "EKYAN Flows Manager — Setup Guide"
  echo ""
  echo -e "${BOLD}Step 1: Create a Meta Developer App${NC}"
  echo "  → https://developers.facebook.com/apps"
  echo "  → New App → Business → Add WhatsApp product"
  echo ""
  echo -e "${BOLD}Step 2: Get your credentials${NC}"
  echo "  WA_TOKEN    : Temporary token (24h) from App Dashboard → WhatsApp → API Setup"
  echo "                OR a permanent System User token from Business Manager"
  echo "  WABA_ID     : WhatsApp Business Account ID (same page, under 'From' number)"
  echo "  WA_PHONE_ID : Phone Number ID (same page)"
  echo ""
  echo -e "${BOLD}Step 3: Create .env.flows${NC}"
  cat > "$ROOT_DIR/.env.flows.example" << 'EOF'
# WhatsApp Flows credentials — DO NOT COMMIT
WA_TOKEN=<your_meta_access_token>
WABA_ID=<your_whatsapp_business_account_id>
WA_PHONE_ID=<your_phone_number_id>
EKYAN_API_URL=http://localhost:8000
EOF
  success "Created .env.flows.example at project root"
  echo "  cp .env.flows.example .env.flows  # then fill in real values"
  echo ""
  echo -e "${BOLD}Step 4: Check dependencies${NC}"
  command -v curl   &>/dev/null && success "curl found"   || warn "curl not found — install with: brew install curl"
  command -v jq     &>/dev/null && success "jq found"     || warn "jq not found (optional but nice) — brew install jq"
  command -v python3 &>/dev/null && success "python3 found" || warn "python3 not found"
  echo ""
  echo -e "${BOLD}Step 5: Start FastAPI (needed for validate/create/upload)${NC}"
  echo "  cd src && uvicorn main:app --reload --port 8000"
  echo ""
  info "Once ready, run:  ./scripts/flows_manager.sh all"
}

cmd_validate() {
  header "Validating Flow JSONs locally"
  info "Checking API is reachable at $API_BASE ..."

  local all_file="$TMP_DIR/all_flows.json"
  local http_code
  http_code=$(curl -s -o "$all_file" -w "%{http_code}" \
    "$API_BASE/agronomist/api/v1/flows/definitions")

  [[ "$http_code" == "200" ]] || error "API not reachable (HTTP $http_code). Start FastAPI first."

  for flow_type in credit_prequalification blocker_report harvest_registration; do
    local out="$TMP_DIR/${flow_type}_single.json"
    if command -v jq &>/dev/null; then
      jq ".${flow_type}" "$all_file" > "$out"
      local version screen_count
      version=$(jq -r '.version' "$out")
      screen_count=$(jq '.screens | length' "$out")
      success "$flow_type — version=$version screens=$screen_count"
    else
      python3 -c "
import json
data = json.load(open('$all_file'))
flow = data['$flow_type']
print(f\"  version={flow['version']} screens={len(flow['screens'])}\")
"
      success "$flow_type"
    fi
  done

  echo ""
  info "To preview in browser (no token needed):"
  echo "  https://developers.facebook.com/tools/whatsapp-flows-playground"
  echo "  Paste the JSON from: $TMP_DIR/<type>_single.json"
}

cmd_create() {
  local flow_type="${1:-}"
  [[ -n "$flow_type" ]] || error "Usage: flows_manager.sh create <flow_type>"
  require_token

  local name; name=$(flow_name "$flow_type")
  local category; category=$(flow_category "$flow_type")

  header "Creating flow: $name"

  local response
  response=$(curl -s -X POST "$GRAPH_API/$WABA_ID/flows" \
    -H "Authorization: Bearer $WA_TOKEN" \
    -F "name=$name" \
    -F "categories=[\"$category\"]")

  echo "$response"

  local flow_id
  if command -v jq &>/dev/null; then
    flow_id=$(echo "$response" | jq -r '.id // empty')
  else
    flow_id=$(python3 -c "import json,sys; d=json.loads('$response'); print(d.get('id',''))" 2>/dev/null || echo "")
  fi

  if [[ -n "$flow_id" ]]; then
    success "Flow created! flow_id=$flow_id"
    echo ""
    info "Save this ID, then run:"
    echo "  ./scripts/flows_manager.sh upload $flow_id $flow_type"
  else
    error "Flow creation failed. Check response above."
  fi
}

cmd_upload() {
  local flow_id="${1:-}"
  local flow_type="${2:-}"
  [[ -n "$flow_id" && -n "$flow_type" ]] || error "Usage: flows_manager.sh upload <flow_id> <flow_type>"
  require_token

  header "Uploading JSON for: $flow_type → flow_id=$flow_id"

  local json_file
  json_file=$(fetch_flow_json "$flow_type")
  success "Flow JSON fetched: $json_file"

  local response
  response=$(curl -s -X POST "$GRAPH_API/$flow_id/assets" \
    -H "Authorization: Bearer $WA_TOKEN" \
    -F "name=flow.json" \
    -F "asset_type=FLOW_JSON" \
    -F "file=@$json_file;type=application/json")

  echo "$response"

  if echo "$response" | grep -q '"success":true'; then
    success "Flow JSON uploaded successfully"
    echo ""
    info "To publish, run:"
    echo "  ./scripts/flows_manager.sh publish $flow_id"
  else
    warn "Check response above for validation errors from Meta."
  fi
}

cmd_publish() {
  local flow_id="${1:-}"
  [[ -n "$flow_id" ]] || error "Usage: flows_manager.sh publish <flow_id>"
  require_token

  header "Publishing flow_id=$flow_id"

  local response
  response=$(curl -s -X POST "$GRAPH_API/$flow_id/publish" \
    -H "Authorization: Bearer $WA_TOKEN")

  echo "$response"

  if echo "$response" | grep -q '"success":true'; then
    success "Flow is now LIVE ✨"
  else
    warn "Publish may have failed. Check response above."
  fi
}

cmd_list() {
  require_token
  header "Listing all flows in WABA $WABA_ID"

  curl -s "$GRAPH_API/$WABA_ID/flows" \
    -H "Authorization: Bearer $WA_TOKEN" \
    | (command -v jq &>/dev/null && jq '.data[] | {id, name, status, categories}' || cat)
}

cmd_get() {
  local flow_id="${1:-}"
  [[ -n "$flow_id" ]] || error "Usage: flows_manager.sh get <flow_id>"
  require_token

  header "Flow details: $flow_id"
  curl -s "$GRAPH_API/$flow_id?fields=id,name,status,categories,validation_errors,preview" \
    -H "Authorization: Bearer $WA_TOKEN" \
    | (command -v jq &>/dev/null && jq . || cat)
}

cmd_deprecate() {
  local flow_id="${1:-}"
  [[ -n "$flow_id" ]] || error "Usage: flows_manager.sh deprecate <flow_id>"
  require_token

  header "Deprecating flow_id=$flow_id"
  curl -s -X POST "$GRAPH_API/$flow_id/deprecate" \
    -H "Authorization: Bearer $WA_TOKEN" \
    | (command -v jq &>/dev/null && jq . || cat)
}

cmd_delete() {
  local flow_id="${1:-}"
  [[ -n "$flow_id" ]] || error "Usage: flows_manager.sh delete <flow_id>"
  require_token

  warn "This will permanently delete flow_id=$flow_id (must be in DRAFT status)"
  read -r -p "Are you sure? (yes/no): " confirm
  [[ "$confirm" == "yes" ]] || { info "Aborted."; exit 0; }

  curl -s -X DELETE "$GRAPH_API/$flow_id" \
    -H "Authorization: Bearer $WA_TOKEN" \
    | (command -v jq &>/dev/null && jq . || cat)
}

cmd_send() {
  local phone="${1:-}"
  local flow_type="${2:-}"
  local flow_id="${3:-}"
  [[ -n "$phone" && -n "$flow_type" && -n "$flow_id" ]] || \
    error "Usage: flows_manager.sh send <phone_e164> <flow_type> <flow_id>\n  e.g.: flows_manager.sh send 254712345678 credit_prequalification 123456789"
  require_token
  require_phone_id

  header "Sending $flow_type flow to $phone"

  local response
  response=$(curl -s -X POST \
    "$API_BASE/agronomist/api/v1/flows/send" \
    -H "Content-Type: application/json" \
    -d "{\"farmer_phone\":\"$phone\",\"flow_type\":\"$flow_type\",\"flow_id\":\"$flow_id\"}")

  echo "$response"
  echo "$response" | grep -q '"status":"sent"' && success "Flow message sent!" || warn "Check response above."
}

cmd_preview() {
  local flow_type="${1:-credit_prequalification}"
  header "Opening Flows Playground for: $flow_type"

  local json_file
  json_file=$(fetch_flow_json "$flow_type")
  success "Flow JSON saved to: $json_file"
  echo ""
  info "Steps:"
  echo "  1. Open: https://developers.facebook.com/tools/whatsapp-flows-playground"
  echo "  2. Click 'Import JSON'"
  echo "  3. Paste contents of: $json_file"
  echo ""
  info "Copying JSON to clipboard..."
  if command -v pbcopy &>/dev/null; then
    cat "$json_file" | pbcopy
    success "Copied to clipboard (macOS)"
  elif command -v xclip &>/dev/null; then
    cat "$json_file" | xclip -selection clipboard
    success "Copied to clipboard (Linux)"
  else
    cat "$json_file"
  fi

  open "https://developers.facebook.com/tools/whatsapp-flows-playground" 2>/dev/null || \
    info "Open manually: https://developers.facebook.com/tools/whatsapp-flows-playground"
}

cmd_all() {
  header "EKYAN Full Flow Deploy — All 3 Flows"
  require_token

  CREDIT_ID=""; BLOCKER_ID=""; HARVEST_ID=""

  for flow_type in credit_prequalification blocker_report harvest_registration; do
    echo ""
    info "── $flow_type ──"

    local name; name=$(flow_name "$flow_type")
    local category; category=$(flow_category "$flow_type")
    local create_resp
    create_resp=$(curl -s -X POST "$GRAPH_API/$WABA_ID/flows" \
      -H "Authorization: Bearer $WA_TOKEN" \
      -F "name=$name" \
      -F "categories=[\"$category\"]")

    local flow_id
    flow_id=$(echo "$create_resp" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null || echo "")

    [[ -n "$flow_id" ]] || { warn "Create failed for $flow_type — skipping. Response: $create_resp"; continue; }
    success "Created: $flow_id"

    case "$flow_type" in
      credit_prequalification) CREDIT_ID="$flow_id" ;;
      blocker_report)          BLOCKER_ID="$flow_id" ;;
      harvest_registration)    HARVEST_ID="$flow_id" ;;
    esac

    local json_file
    json_file=$(fetch_flow_json "$flow_type")
    local upload_resp
    upload_resp=$(curl -s -X POST "$GRAPH_API/$flow_id/assets" \
      -H "Authorization: Bearer $WA_TOKEN" \
      -F "name=flow.json" \
      -F "asset_type=FLOW_JSON" \
      -F "file=@$json_file;type=application/json")

    echo "$upload_resp" | grep -q '"success":true' || { warn "Upload failed for $flow_type: $upload_resp"; continue; }
    success "Uploaded JSON"

    local pub_resp
    pub_resp=$(curl -s -X POST "$GRAPH_API/$flow_id/publish" \
      -H "Authorization: Bearer $WA_TOKEN")

    echo "$pub_resp" | grep -q '"success":true' && success "Published ✨" || warn "Publish failed: $pub_resp"
  done

  echo ""
  header "Summary — add these to your .env"
  echo "  CREDIT_FLOW_ID=$CREDIT_ID"
  echo "  BLOCKER_REPORT_FLOW_ID=$BLOCKER_ID"
  echo "  HARVEST_REGISTRATION_FLOW_ID=$HARVEST_ID"
}

# ── Entrypoint ────────────────────────────────────────────────────────────────
load_env

COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
  setup)      cmd_setup ;;
  validate)   cmd_validate ;;
  create)     cmd_create "$@" ;;
  upload)     cmd_upload "$@" ;;
  publish)    cmd_publish "$@" ;;
  list)       cmd_list ;;
  get)        cmd_get "$@" ;;
  deprecate)  cmd_deprecate "$@" ;;
  delete)     cmd_delete "$@" ;;
  send)       cmd_send "$@" ;;
  preview)    cmd_preview "$@" ;;
  all)        cmd_all ;;
  help|--help|-h|*)
    echo -e "${BOLD}EKYAN WhatsApp Flows Manager${NC}"
    echo ""
    echo "Usage: ./scripts/flows_manager.sh <command> [args]"
    echo ""
    echo "Commands (no token needed):"
    echo "  setup                              — setup guide & dependency check"
    echo "  validate                           — validate flow JSONs locally"
    echo "  preview [type]                     — copy JSON + open playground"
    echo ""
    echo "Commands (token required):"
    echo "  create  <type>                     — create flow on Meta"
    echo "  upload  <flow_id> <type>           — upload JSON to existing flow"
    echo "  publish <flow_id>                  — publish flow (go live)"
    echo "  list                               — list all flows in your WABA"
    echo "  get     <flow_id>                  — get flow details"
    echo "  deprecate <flow_id>                — deprecate a live flow"
    echo "  delete  <flow_id>                  — delete a draft flow"
    echo "  send    <phone> <type> <flow_id>   — send flow to a farmer"
    echo "  all                                — create+upload+publish all 3"
    echo ""
    echo "Flow types: credit_prequalification | blocker_report | harvest_registration"
    ;;
esac
