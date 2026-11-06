# Module 5: UNICEF & Donor Impact M&E Dashboard

## 1. Objective
Provide UNICEF Kenya, Generation Unlimited (GenU), county governments, and international funding donors (e.g., FCDO, USAID, European Union, Mastercard Foundation) with transparent, real-time, tamper-proof Monitoring & Evaluation (M&E) telemetry.

---

## 2. Key Performance Indicators (KPIs) Tracked

```
+---------------------------------------------------------------------------------+
|                       EKYAN REAL-TIME IMPACT DASHBOARD                          |
+---------------------------------------------------------------------------------+
| [Youth Agripreneurs Enrolled]   [Acres Under Regenerative Ag]   [Average Income]|
|          14,820                             32,450 Acres             +64.5% YoY |
| (61% Female / Young Mothers)   (Zero Synthetic Chemical Runoff)   (KES 28,400/m)|
+---------------------------------------------------------------------------------+
| [Child Nutrition Impact]        [Credit Unlocked Via AI Score]  [Post-Harvest]  |
|  112,000 Children Reached               $1,420,000 USD           Reduced by 38% |
| (Diverse Dietary Score +42%)          (98.4% Repayment Rate)      (Direct B2B)  |
+---------------------------------------------------------------------------------+
```

---

## 3. Technology Stack & GIS Layer

* **Frontend:** Next.js 14, TailwindCSS, TypeScript, Recharts for analytics.
* **Geospatial Mapping:** Mapbox GL / Deck.gl / Leaflet with GeoJSON layers showing:
  * Youth farm clusters and active demonstration centers across Kenyan counties (Busia, Kirinyaga, Kisumu, Samburu, etc.).
  * Soil moisture heatmaps and NDVI change detection.
  * Real-time pest outbreak alert clusters.
* **Backend:** FastAPI (Python 3.11), Celery workers for scheduled ETL aggregation.
* **Database:** PostgreSQL 16 with **PostGIS** extension for spatial queries (bounding boxes, proximity searches, radius queries).
* **Data Privacy:** Full compliance with the Kenya Data Protection Act (2019) and UNICEF Child Safeguarding standards. All youth PII is anonymized and aggregated at the county/ward level.

