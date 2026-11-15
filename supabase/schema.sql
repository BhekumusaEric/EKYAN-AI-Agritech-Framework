-- ============================================================
-- EKYAN Connect — Supabase Schema
-- Run in Supabase SQL Editor or via supabase db push
-- ============================================================

-- Enable required extensions
create extension if not exists postgis;
create extension if not exists timescaledb cascade;

-- ============================================================
-- MODULE 1 & BRS CORE: Farmers, Agripreneurs, Blockers
-- ============================================================

create table if not exists farmers (
    id              uuid primary key default gen_random_uuid(),
    phone           text unique not null,
    name            text,
    county          text not null,
    ward            text,
    language        text default 'swahili',
    farm_size_acres float,
    location        geography(Point, 4326),
    created_at      timestamptz default now()
);

-- BRS P01–P05: the core operational loop
create table if not exists blockers (
    id              uuid primary key default gen_random_uuid(),
    farmer_phone    text not null,
    message         text not null,
    county          text,
    language        text,
    category        text,           -- inputs / finance / market / advisory / climate / other
    brs_problem_id  text,           -- P01–P05
    status          text default 'open',  -- open / in_progress / resolved
    resolved_at     timestamptz,
    created_at      timestamptz default now()
);

create index if not exists idx_blockers_status   on blockers(status);
create index if not exists idx_blockers_county   on blockers(county);
create index if not exists idx_blockers_category on blockers(category);

-- ============================================================
-- MODULE 2: Credit Scoring
-- ============================================================

create table if not exists credit_profiles (
    id                          uuid primary key default gen_random_uuid(),
    farmer_id                   text unique not null,
    ekyan_modules_completed     int default 0,
    quiz_avg_score              float default 0,
    demo_days_attended          int default 0,
    mpesa_monthly_inflow_kes    float default 0,
    mpesa_consistency_score     float default 0,
    chama_savings_months        int default 0,
    ndvi_season1                float default 0.3,
    ndvi_season2                float default 0.3,
    farm_size_acres             float default 1.0,
    peer_endorsements           int default 0,
    cooperative_standing        float default 0.5,
    mentor_verified             boolean default false,
    deliveries_completed        int default 0,
    delivery_adherence_rate     float default 0,
    previous_loan_repaid        boolean,
    updated_at                  timestamptz default now()
);

create table if not exists credit_decisions (
    id                      uuid primary key default gen_random_uuid(),
    farmer_id               text not null,
    aci_score               int not null,
    risk_tier               text not null,
    approved                boolean not null,
    recommended_loan_usd    int not null,
    score_breakdown         jsonb,
    improvement_actions     text[],
    created_at              timestamptz default now()
);

create index if not exists idx_credit_decisions_farmer on credit_decisions(farmer_id);
create index if not exists idx_credit_decisions_tier   on credit_decisions(risk_tier);

-- ============================================================
-- MODULE 3: Climate Advisory
-- ============================================================

create table if not exists climate_nudges (
    id              uuid primary key default gen_random_uuid(),
    county          text not null,
    trigger         text not null,
    severity        text not null,
    message_swahili text,
    message_english text,
    sent_at         timestamptz default now()
);

-- TimescaleDB hypertable for time-series NDVI data
create table if not exists ndvi_readings (
    time        timestamptz not null,
    farmer_id   text not null,
    county      text,
    ndvi        float not null,
    source      text default 'sentinel-2'
);
select create_hypertable('ndvi_readings', 'time', if_not_exists => true);

-- ============================================================
-- MODULE 4: Marketplace
-- ============================================================

create table if not exists harvest_registrations (
    id              uuid primary key default gen_random_uuid(),
    farmer_id       text not null,
    county          text not null,
    commodity       text not null,
    volume_kg       float not null,
    harvest_date    date not null,
    quality_grade   text default 'A',
    location        geography(Point, 4326),
    status          text default 'available',  -- available / matched / delivered
    created_at      timestamptz default now()
);

create index if not exists idx_harvest_commodity on harvest_registrations(commodity);
create index if not exists idx_harvest_date      on harvest_registrations(harvest_date);

create table if not exists buyer_orders (
    id                      uuid primary key default gen_random_uuid(),
    buyer_id                text not null,
    buyer_name              text not null,
    buyer_type              text not null,
    commodity               text not null,
    volume_kg_needed        float not null,
    delivery_date           date not null,
    county                  text,
    max_price_kes_per_kg    float,
    status                  text default 'open',
    created_at              timestamptz default now()
);

create table if not exists contracts (
    id                          uuid primary key default gen_random_uuid(),
    buyer_order_id              uuid references buyer_orders(id),
    farmer_ids                  text[],
    commodity                   text not null,
    total_volume_kg             float not null,
    fair_price_kes              float not null,
    total_value_kes             float not null,
    farmer_gain_vs_broker_kes   float,
    escrow_triggered            boolean default false,
    mpesa_payment_ref           text,
    status                      text default 'pending',  -- pending / active / fulfilled / disputed
    created_at                  timestamptz default now()
);

-- ============================================================
-- MODULE 5: M&E Dashboard KPIs
-- ============================================================

create table if not exists me_kpis (
    id                          uuid primary key default gen_random_uuid(),
    snapshot_date               date not null,
    county                      text,
    youth_enrolled              int default 0,
    youth_female_pct            float default 0,
    acres_regenerative          float default 0,
    avg_monthly_income_kes      float default 0,
    children_nutrition_reached  int default 0,
    credit_unlocked_usd         float default 0,
    repayment_rate_pct          float default 0,
    post_harvest_loss_reduction float default 0,
    blockers_open               int default 0,
    blockers_resolved           int default 0,
    created_at                  timestamptz default now()
);

create index if not exists idx_me_kpis_county on me_kpis(county);
create index if not exists idx_me_kpis_date   on me_kpis(snapshot_date);

-- ============================================================
-- ROW LEVEL SECURITY (Kenya Data Protection Act 2019)
-- ============================================================

alter table farmers              enable row level security;
alter table blockers             enable row level security;
alter table credit_profiles      enable row level security;
alter table credit_decisions     enable row level security;
alter table harvest_registrations enable row level security;
alter table contracts            enable row level security;

-- Service role bypasses RLS (backend API)
-- Anon/authenticated roles get read-only on aggregated M&E data only
create policy "service_role_all" on farmers
    using (auth.role() = 'service_role');

create policy "service_role_all" on blockers
    using (auth.role() = 'service_role');

create policy "service_role_all" on credit_profiles
    using (auth.role() = 'service_role');

create policy "service_role_all" on credit_decisions
    using (auth.role() = 'service_role');

create policy "service_role_all" on harvest_registrations
    using (auth.role() = 'service_role');

create policy "service_role_all" on contracts
    using (auth.role() = 'service_role');

-- M&E KPIs are public read (aggregated, no PII)
create policy "public_read_me_kpis" on me_kpis
    for select using (true);
