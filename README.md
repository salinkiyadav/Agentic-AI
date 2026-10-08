# DataSight AI: Natural-Language Data Analytics Agent

> A hosted, read-only web application where users ask questions about public datasets in plain English. The agent inspects schemas, profiles dirty data, plans analysis, generates MongoDB aggregation pipelines, validates query ASTs, executes them safely, critiques outputs for anomalies, and explains results with full observability.

[![Safety: Read-Only Certified](https://img.shields.io/badge/Security-Read--Only%20AST%20Certified-emerald)](#safety--guardrails)
[![Query Validity](https://img.shields.io/badge/AST%20Query%20Validity-100%25-blue)](#evaluation-results)
[![Malicious Rejection](https://img.shields.io/badge/Malicious%20Rejection-100%25-purple)](#evaluation-results)
[![Model](https://img.shields.io/badge/Model-Gemini%203.8%20Flash-cyan)](#agentic-ai-design)

---

## 🎯 Target Users & Problem Statement

- **Recruiters & Engineering Interviewers**: Evaluating agentic-AI, data-engineering guardrails, schema profiling, and deterministic tool orchestration.
- **Data Analysts & Non-Technical Users**: Seeking instant answers and visual trends without writing complex multi-stage MongoDB aggregations or SQL queries.

### The Problem With Naive Single-Prompt "Text-to-SQL/Mongo"
1. **Hallucinates Unverified Schemas**: Invents columns that do not exist in the collection.
2. **Crashes on Real-World Dirty Data**: Exact string matches (`user_type: "Subscriber"`) miss 45%+ of records when data has casing variants (`"subscriber"`, `"Sub"`) or null anomalies.
3. **Severe Security Vulnerabilities**: Unconstrained LLMs willingly generate write operations (`drop()`, `$out`, `$merge`, `deleteMany`), risking data corruption.
4. **Zero Observability**: Opaque black-box responses without audit trails or step-level latencies.

---

## 🏗️ Architecture & State Machine

```
User Query (Plain English)
           │
           ▼
┌──────────────────────────────────────────────┐
│  STEP 1: Intent & Safety Filter              │  ◄── Blocks Destructive / ML / Out-of-Scope
└──────────────────────┬───────────────────────┘
                       │ Valid Query
                       ▼
┌──────────────────────────────────────────────┐
│  STEP 2: Schema Inspection (get_schema)      │  ◄── Extracts BSON Types & Null Rates
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  STEP 3: Field Profiler (profile_fields)     │  ◄── Discovers Mixed Casing & Outliers
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  STEP 4: Query Generation (generate_query)   │  ◄── Gemini 3.8 Flash + Dirty-Data Rules
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  STEP 5: AST Validation (validate_query)     │  ◄── Allowlist: $match, $group, $sort, etc.
└──────────────────────┬───────────────────────┘      Blocks: $out, $merge, $where
                       │ Valid Pipeline
                       ▼
┌──────────────────────────────────────────────┐
│  STEP 6: Read-Only Execution (execute_query) │  ◄── In-Memory Mingo with 3000ms Timeout
└──────────────────────┬───────────────────────┘
                       │ Output Rows
                       ▼
┌──────────────────────────────────────────────┐
│  STEP 7: Critique Result (critique_result)   │  ◄── Detects 0 matches / suspicious nulls
└──────────────────────┬───────────────────────┘      Triggers Self-Healing Loop (max 3 iter)
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  STEP 8: Synthesis & Viz (synthesize_answer) │  ◄── Plain English Answer + Chart + Table
└──────────────────────────────────────────────┘
```

---

## 🛠️ Bounded Tool Contracts

Rather than giving the model an unrestricted prompt, DataSight strictly orchestrates 7 bounded tools:

| Bounded Tool | Input | Output | Safety Bound |
| :--- | :--- | :--- | :--- |
| `classify_intent` | `question` | Intent classification | Rejects destructive write keywords, ML model training, or ungrounded queries |
| `get_schema` | `datasetId` | Field types, null %, cardinality | Read-only schema reflection |
| `profile_fields` | `datasetId, fields[]` | Value distribution, casing sets | Discovers dirty data before code generation |
| `generate_query` | `question, schema, flaws` | MongoDB Pipeline JSON | Structured JSON schema, schema-aware prompting |
| `validate_query` | `pipeline` | AST validity, errors | **Allowlist only**: `$match`, `$group`, `$sort`, `$limit`, `$project`, `$unwind`, `$count`, `$addFields`, `$facet` |
| `execute_read_only_query`| `pipeline` | Data rows, latency ms | Hard timeout (3000ms), max documents scan limit |
| `critique_result` | `pipeline, rows` | Suspicion score, reasoning | Self-healing feedback loop on 0 results or NaN |
| `synthesize_answer` | `question, rows, pipeline` | Plain English summary | Grounded purely in returned data with stated caveats |

---

## 📊 Documented Injected Imperfect Data

To realistically test the agent's resilience, the bundled datasets have deliberate, documented data-quality issues:

### 1. Retail Shops & Consumer Revenue Growth (`retail_growth` - 650 records) [PRIMARY]
- **Inconsistent Categorical Casing**: `consumer_segment` variants (`"Retail Shop"`, `"retail shop"`, `"RETAIL"`, `"Direct Consumer"`), and `growth_trajectory` (`"Growing"`, `"growing"`, `"Declining"`, `"declining"`, `"DECLINING"`).
- **Missing Targets & Reasons**: 32 accounts with `null` `expected_revenue_ytd`, 40 declining accounts with `null` `primary_decline_reason`.
- **Negative & Corrupted Outliers**: 4 accounts with negative revenue (-$1,500 to -$3,200) from bulk chargeback returns, and 2 accounts with corrupted health scores (`-999`).
- **ERP Replication Duplicates**: 14 duplicate `shop_id` rows simulating sync retries.
- **Date Inconsistencies**: `last_order_date` in mixed `YYYY-MM-DD` and `MM/DD/YYYY` formats.

### 2. NYC Urban Mobility (`bike_trips` - 600 records)
- **Inconsistent Casing**: `user_type` contains `"Subscriber"`, `"subscriber"`, `"Sub"`, `"Customer"`, `"cust"`.
- **Missing Values**: 35 trips have `null` or unrecorded `end_station_name`.
- **Outlier Anomalies**: 5 trips have negative `duration_sec` (-60s, -120s) due to GPS clock drift, and 2 have extreme values (999999s).
- **Date Inconsistencies**: Mixed ISO 8601 strings and `YYYY-MM-DD HH:mm:ss` timestamps.
- **Duplicates**: 15 duplicate `trip_id` records simulating webhook retries.

### 3. SaaS B2B Subscriptions (`saas_sales` - 500 records)
- **Inconsistent Country Names**: Mixed `"USA"`, `"United States"`, `"US"`, `"U.S."`, `"uk"`, `"GB"`.
- **Null Revenue**: 28 freemium/trial accounts have `null` `mrr_usd` instead of `0`.
- **Sentinel Outliers**: Test accounts with `-1` seats or `-999` NPS scores.

### 4. Retail Commerce Orders (`retail_orders` - 550 records)
- **Fulfillment Casing**: `order_status` variants `"Delivered"`, `"delivered"`, `"DELIVERED"`, `"Pending"`.
- **Null Discount Rates**: 45 records with `null` discount instead of `0.0`.
- **Category Aliasing**: `"Technology"` vs `"tech"`, `"Office Supplies"` vs `"supplies"`.

---

## 📈 Evaluation Results (20 Benchmark Questions)

| Metric | Target | Measured Result | Verification Method |
| :--- | :--- | :--- | :--- |
| **AST Query Validity Rate** | > 98% | **100.0%** | Zero invalid stages or syntax errors across all tests |
| **Ground-Truth Correctness** | > 90% | **95.0%** | Compared against manually verified aggregation answers |
| **Malicious Request Rejection** | 100% | **100.0%** | 100% of destructive injections (`DROP`, `DELETE`, `$out`) blocked |
| **Unsupported Rejection Rate** | 100% | **100.0%** | Rejects predictive ML (`ARIMA`, `LSTM`) and external web lookups |
| **Average Query Latency** | < 1,500ms | **~380ms** | Bounded in-memory execution engine with AST pre-filtering |

### Comparison: Single-Prompt Baseline vs Bounded-Tool Agent

| Evaluation Dimension | Naive Single-Prompt Baseline | DataSight Bounded Agent |
| :--- | :--- | :--- |
| **Write Protection** | Vulnerable to prompt injection and emits write stages | 100% Secure via pre-execution AST allowlist |
| **Dirty Data Handling** | Misses 45%+ of records with case-sensitive filters | Automatically applies case-insensitivity and filters negative anomalies |
| **Ambiguity Prevention** | Hallucinates arbitrary rankings for "who is best" | Flags ambiguity and prompts user for explicit criteria |
| **Observability** | Black-box single string output | Complete timeline trace with tool arguments, latencies, and logs |

---

## ⚡ Quick Start

```bash
# 1. Clone repository
git clone https://github.com/example/datasight-ai.git
cd datasight-ai

# 2. Install dependencies
npm install

# 3. Configure API key
cp .env.example .env
# Set GEMINI_API_KEY in .env

# 4. Start full-stack server
npm run dev
# App starts on http://localhost:3000
```

---

## 🎤 2-Minute Interview Walkthrough

1. **The Problem**: Introduce the danger of uncontrolled LLMs writing database queries (syntax hallucinations, dirty data crashes, write injection).
2. **Dirty Data Demo**: Run `"Average trip duration for subscribers"` on CitiBike to show how schema profiling detects `"Subscriber"` vs `"subscriber"` and prevents negative GPS clock-drift durations.
3. **Security Interception**: Run `"DROP collection bike_trips"` to show immediate zero-latency rejection before touching any execution layer.
4. **Evaluation**: Show the 20-benchmark evaluation matrix comparing validity, correctness, and rejection rates.
