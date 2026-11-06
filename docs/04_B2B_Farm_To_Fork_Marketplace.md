# Module 4: B2B Farm-to-Fork Marketplace & Price Forecaster

## 1. Problem Statement
In traditional agricultural supply chains across Kenya, young smallholder farmers sell their produce at farmgate to informal brokers (*middlemen*). Brokers routinely underpay by 40% to 65% of the real wholesale terminal price in Nairobi, Kisumu, or Mombasa. Furthermore, individual youth farmers lack the volume to sell directly to institutional buyers (such as secondary school feeding schemes, hospitals, and supermarket distributors).

---

## 2. System Workflow: Aggregation & Fair Matching

```mermaid
sequenceDiagram
    autonumber
    actor Youth as Youth Farming Cooperative (Cluster)
    participant Engine as Aggregation & Price Forecasting Platform
    actor Buyer as Institutional Buyer (School / Supermarket)

    Youth->>Engine: Registers expected harvest (e.g. 2 tons tomatoes in 14 days)
    Engine->>Engine: Aggregates supply from 8 youth farms in Kirinyaga
    Engine->>Engine: Forecasts expected 14-day market price band (KES/kg)
    Buyer->>Engine: Posts purchase order (e.g. 10 tons tomatoes / week)
    Engine->>Buyer: Matches with aggregated youth cooperative cluster
    Engine-->>Youth: Locks binding off-take contract with fair price guarantee
    Youth->>Buyer: Direct delivery to distribution center (no brokers)
    Buyer->>Engine: Confirms receipt & inspection
    Engine->>Youth: Instant automated M-Pesa escrow settlement
```

---

## 3. Commodity Price Forecasting Model

* **Architecture:** Additive regression time-series forecasting (Facebook Prophet / NeuralProphet) or LightGBM regressor with autoregressive lag features.
* **Input Features:**
  * Historical daily wholesale market prices from Kenya National Bureau of Statistics (KNBS) and Ministry of Agriculture.
  * Seasonal rainfall indicators and drought indices.
  * Diesel and transport fuel price indices.
  * Public holiday and school term dates (demand surges).
* **Output:** Predicted price distribution (KES/kg) with $80\%$ confidence intervals over a 30-day forecast horizon.

---

## 4. Contract Pooling & Logistics Optimization

To resolve the lack of cold-chain infrastructure:
1. **Dynamic Pickup Scheduling:** Groups neighboring youth farms into a shared logistics run so a single refrigerated truck can collect from 5–10 farms in a tight geographical radius.
2. **School Feeding Program Integration:** Directly pairs youth farms with local secondary schools under the Ministry of Education feeding program, ensuring zero food miles and zero intermediary markups.
