# Module 2: Alternative ML Credit Scoring for Youth Agripreneurs

> **Status: unvalidated research concept — not approved for MVP or lending use.** The claims, data sources, feature weights, model, and named partner examples below have not been validated with Kenyan lenders, affected users, or legal/privacy review. EKYAN's Business Book uses recordkeeping and application preparation only; it does not calculate creditworthiness or make lending recommendations. Do not connect this concept to a lending workflow without a separately approved, locally validated specification.

## 1. Problem Statement
Commercial banks and formal lenders in Kenya require three primary underwriting components:
1. Formal land ownership (Title Deeds).
2. Documented payroll pay stubs.
3. Conventional credit bureau history (CRB).

Young people—particularly rural youth, young mothers, and out-of-school agripreneurs—possess none of these. As a result, 85%+ of youth farming initiatives in Kenya cannot access working capital loans to purchase drip kits, high-yield seeds, or bio-fertilizers.

---

## 2. Alternative Data Feature Matrix

Our Machine Learning framework calculates an **Agri-Creditworthiness Index (ACI)** using non-traditional behavioral, educational, and earth-observation data points:

```mermaid
graph LR
    subgraph Data Sources
        A[M-Pesa Mobile Money Velocity]
        B[EKYAN Training Completion & Quiz Scores]
        C[Satellite NDVI Crop Health History]
        D[Peer Co-op Endorsements]
        E[Historical Harvest & Repayment Records]
    end

    subgraph Feature Engineering & ML Pipeline
        F[Feature Normalization & Imputation]
        G[XGBoost / LightGBM Classifier]
        H[Explainable AI Layer - SHAP]
    end

    subgraph Human-Reviewed Decision Support
        I[Finance Readiness Score]
        J[Readiness Band]
        K[Human Review Required]
    end

    A --> F
    B --> F
    C --> F
    D --> F
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    I --> K
```

### Feature Weights and Data Vectors

| Feature Category | Specific Indicators | Weight | Source |
| :--- | :--- | :---: | :--- |
| **Commitment & Knowledge** | EKYAN modules completed, quiz mastery, attendance at demo days | 25% | LMS / Kuza Learning Platform |
| **Financial Discipline** | M-Pesa cash inflows, bill payments, consistency of savings in *Chama* (village savings group) | 25% | Mobile Money Telemetry (with consent) |
| **Physical Cultivation Proof** | Satellite-verified NDVI greenness curve over 2 consecutive seasons | 20% | Sentinel-2 / European Space Agency |
| **Social Capital & Trust** | Peer endorsements, local chief or mentor verification, cooperative standing | 15% | Cooperative Hub Data |
| **Market Discipline** | Record of previous produce dispatches and adherence to delivery contracts | 15% | B2B Marketplace History |

---

## 3. Algorithm & Explainability

* **Base Model:** Gradient-boosted decision trees (`XGBClassifier`) optimized for imbalanced tabular credit datasets.
* **Fairness & Bias Audit:** Strict exclusion of protected demographic features (ethnicity, clan, marital status). Continuous calibration to ensure equal opportunity and parity for young mothers and female entrepreneurs.
* **Explainability:** The prototype returns a score breakdown and improvement actions for human review. It does not approve or reject applicants or recommend a loan amount:
  * *"Complete 2 more regenerative agriculture modules on pest control."*
  * *"Maintain consistent weekly savings in your cooperative account for 30 more days."*

---

## 4. Integration with Microfinance Institutions & UNICEF Seed Grants

The generated score is exposed via a secure REST API to local partner microfinance institutions (e.g., Faulu Kenya, Kenya Women Microfinance Bank - KWFT, Equity Group Foundation) or used to prioritize UNICEF revolving seed grant disbursements.

