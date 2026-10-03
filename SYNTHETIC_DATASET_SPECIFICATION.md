# AI-Powered Financial Scam Detection & Loan Risk Management
# Synthetic Dataset Architecture & ML Pipeline Specification

> **Workspace:** Meridian — Connected Risk Workspace  
> **Target Problem Statement:** Problem Statement 3 — AI-Powered Financial Scam Detection & Loan Risk Management  
> **Status:** Specification Phase (Awaiting Approval prior to Generator Implementation)  
> **Compliance:** Strict separation of Fraud Risk and Loan Repayment Risk; Full compatibility with V1 contracts.

---

## 1. Executive Summary & V1 Context

Meridian is a connected risk investigation workspace built for institutional fraud and credit risk analysts. The V1 prototype already provides an interactive UI, state ledger selectors, contextual inference rules, and a case management system.

The dataset to be synthesized must model a realistic financial ecosystem where:
- Customer financial profiles and behavioral habits govern transactions and credit uptake.
- Physical devices and merchant profiles exhibit distinct risk characteristics.
- Scam events generate anomalous temporal and transactional patterns without relying on trivial heuristic giveaways.
- Income, recurring expenses, and debt dynamics drive repayment performance and early distress indicators.
- Fraud/Scam Risk (0–100) and Loan Repayment Distress Risk (0–100) are evaluated as **two separate, decoupled risk scores**.
- Strict temporal integrity is preserved: predictions at timestamp $T$ consume data strictly observed at $t \le T$ without data leakage.

---

## 2. Proposed Relational Dataset Schema

The synthetic dataset is architectured across 8 normalized, joinable CSV tables to avoid monolithic flat structures and enable relational feature engineering.

### 2.1. Entity Relationship Overview

```text
+-----------------------+        +------------------------+        +-----------------------+
|       CUSTOMERS       |<---+---|      TRANSACTIONS      |---+--->|       MERCHANTS       |
+-----------------------+    |   +------------------------+   |    +-----------------------+
| PK customer_id        |    |   | PK transaction_id      |   |    | PK merchant_id        |
|    name               |    |   | FK customer_id         |   |    |    merchant_name      |
|    occupation         |    |   | FK merchant_id (opt)   |   |    |    merchant_category  |
|    monthly_income     |    |   | FK device_id           |   |    |    merchant_risk_score|
|    opening_cash       |    |   |    timestamp           |   |    +-----------------------+
|    opening_credit     |    |   |    amount              |   |
|    credit_limit       |    |   |    channel             |   |
+-----------------------+    |   |    direction           |   |
            ^                |   |    is_fraud (Target)   |   |
            |                |   |    scam_type (Target)  |   |
            |                |   +------------------------+   |
            |                |                |               |
            |                |                v               |
            |                |   +------------------------+   |
            |                |   |        DEVICES         |   |
            |                |   +------------------------+   |
            |                |   | PK device_id           |   |
            |                |   |    device_type         |   |
            |                |   |    operating_system    |   |
            |                |   |    device_risk_score   |   |
            |                |   +------------------------+   |
            |                |                                |
+-----------------------+    |   +------------------------+   |
|  BEHAVIORAL_PROFILES  |<---+---|    CUSTOMER_EVENTS     |---+
+-----------------------+    |   +------------------------+
| PK profile_id         |    |   | PK event_id            |
| FK customer_id        |    |   | FK customer_id         |
|    normal_mean_amount |    |   |    timestamp           |
|    normal_frequency   |    |   |    kind                |
+-----------------------+    |   |    transaction_ids     |
                             |   +------------------------+
+-----------------------+    |
|         LOANS         |<---+
+-----------------------+    |
| PK loan_id            |    |
| FK customer_id        |    |
|    principal          |    |
|    monthly_emi        |    |
|    loan_risk_class    |    |
+-----------------------+    |
            ^                |
            |                |
+-----------------------+    |
|      REPAYMENTS       |    |
+-----------------------+    |
| PK repayment_id       |    |
| FK loan_id            |----+
| FK customer_id        |
|    amount_due/paid    |
|    days_delayed       |
|    repayment_status   |
+-----------------------+
```

### 2.2. Table Index
1. **`customers.csv`**: Demographics, employment, salary, budgeted recurring expenses, credit limit, opening balances, debt.
2. **`merchants.csv`**: Merchant entity profiles, categories, risk tier, geographic location, historical dispute/fraud frequencies.
3. **`devices.csv`**: Hardware fingerprint, OS, emulator flag, rooted/jailbroken flag, IP risk score, customer-sharing cardinality.
4. **`behavioral_profiles.csv`**: Baseline spending distributions per customer (mean amount, standard deviation, typical transacting hours, typical daily velocity, usual recipient count).
5. **`transactions.csv`**: Core ledger records with timestamp, amount, direction (`in`/`out`), channel, counterparty, category, risk indicators, and ground truth labels (`is_fraud`, `scam_type`).
6. **`customer_events.csv`**: Chronological contextual observations (`baseline`, `device`, `transfer`, `liquidity`, `income`, `verification`) enabling V1 timeline playback and evidence linking.
7. **`loans.csv`**: Contractual loan facilities, principal, EMI, tenure, interest rate, payment due day, schedule dates, and loan status.
8. **`repayments.csv`**: Historical and scheduled installment records, due dates, settlement dates, amounts due/paid, days delayed, and repayment status.

---

## 3. Table Relationships & Referential Integrity

| Parent Table | Child Table | Foreign Key | Multiplicity | Integrity & Cascade Rules |
| :--- | :--- | :--- | :--- | :--- |
| `customers` | `transactions` | `customer_id` | `1 : N` | Every transaction must belong to an existing customer record. |
| `customers` | `loans` | `customer_id` | `1 : N` | A customer can hold 0, 1, or multiple loan contracts. |
| `customers` | `behavioral_profiles` | `customer_id` | `1 : 1` | Exactly one baseline profile per customer. |
| `customers` | `customer_events` | `customer_id` | `1 : N` | Event sequence ordered chronologically per customer. |
| `loans` | `repayments` | `loan_id` | `1 : N` | Each repayment references an active loan. |
| `customers` | `repayments` | `customer_id` | `1 : N` | Denormalized customer reference for efficient filtering. |
| `merchants` | `transactions` | `merchant_id` | `1 : N (nullable)` | Present for merchant checkouts/bill payments; null for P2P/transfers. |
| `devices` | `transactions` | `device_id` | `1 : N` | Identifies the physical device executing the transaction. |
| `transactions` | `customer_events` | `transaction_ids` | `M : N (delimited)` | Events reference 0, 1, or multiple relevant transaction IDs. |

---

## 4. Comprehensive Data Dictionary

### 4.1. `customers.csv`
| Column Name | Data Type | Range / Format | Description | Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `customer_id` | `VARCHAR(16)` | `MR-[1001-99999]` | Primary key; unique customer identifier | `MR-1001` |
| `name` | `VARCHAR(64)` | Realistic Indian names | Full customer name | `Arjun Mehta` |
| `occupation` | `VARCHAR(48)` | Salaried, Consultant, Business, etc. | Professional occupation | `Product designer` |
| `city` | `VARCHAR(32)` | Tier 1/2/3 Indian cities | Primary city of residence | `Bengaluru` |
| `state` | `VARCHAR(32)` | Indian states/UTs | State of residence | `Karnataka` |
| `account_age_days` | `INT` | `30 – 3650` | Account tenure in days | `720` |
| `monthly_income` | `NUMERIC(12,2)` | `₹15,000 – ₹5,00,000` | Baseline monthly salary/earnings | `85000.00` |
| `income_change_pct` | `NUMERIC(5,2)` | `-100.00% – +100.00%` | Income change over last 90 days | `-15.50` |
| `monthly_expense` | `NUMERIC(12,2)` | `₹10,000 – ₹3,00,000` | Baseline budgeted monthly essential expense | `42000.00` |
| `expense_change_pct`| `NUMERIC(5,2)` | `-50.00% – +150.00%` | Expense drift over last 90 days | `12.00` |
| `opening_cash` | `NUMERIC(12,2)` | `₹0 – ₹10,00,000` | Ledger liquid cash at dataset start | `41000.00` |
| `opening_credit` | `NUMERIC(12,2)` | `₹0 – ₹5,00,000` | Drawn credit liability at dataset start | `4000.00` |
| `credit_limit` | `NUMERIC(12,2)` | `₹20,000 – ₹10,00,000` | Total approved credit line / card limit | `60000.00` |
| `existing_debt` | `NUMERIC(12,2)` | `₹0 – ₹50,00,000` | Total outstanding principal debt | `360000.00` |
| `credit_history_months`| `INT` | `6 – 240` | Length of bureau credit file in months | `48` |
| `number_of_active_loans`| `INT` | `0 – 5` | Count of currently active credit facilities | `1` |
| `number_of_active_accounts`| `INT` | `1 – 6` | Associated bank/wallet accounts | `2` |
| `usual_transfer_amount`| `NUMERIC(12,2)`| `₹500 – ₹50,000` | Typical median P2P/transfer amount | `3500.00` |
| `preferred_channel` | `ENUM` | `UPI`, `Card`, `Wallet`, `Digital banking` | Channel with highest transaction frequency | `UPI` |
| `financial_trajectory` | `ENUM` | `healthy`, `organic_distress`, `scam_shock`, `mule`, `mild_distress`, `ambiguous` | Underlying behavioral archetype | `scam_shock` |

### 4.2. `merchants.csv`
| Column Name | Data Type | Range / Format | Description | Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `merchant_id` | `VARCHAR(16)` | `MCH-[10001-99999]` | Primary key; unique merchant identifier | `MCH-10492` |
| `merchant_name` | `VARCHAR(64)` | Merchant entity name | Name / brand | `QuickPay Transfers` |
| `merchant_category`| `ENUM` | `e-commerce`, `food`, `travel`, `utilities`, `gaming`, `investment`, `financial_services`, `retail`, `healthcare`, `education`, `unknown` | Business category | `investment` |
| `merchant_location`| `VARCHAR(32)` | Indian cities / Online | Registered location | `Mumbai` |
| `merchant_age_days`| `INT` | `1 – 3650` | Business age in days | `45` |
| `transaction_volume`| `INT` | `10 – 500,000` | 30-day transaction count | `1250` |
| `avg_transaction_amount`| `NUMERIC(10,2)`| `₹50 – ₹1,00,000` | Typical ticket size | `12500.00` |
| `merchant_risk_score`| `NUMERIC(5,2)`| `0.00 – 100.00` | Baseline entity risk rating | `78.50` |
| `previous_fraud_reports`| `INT` | `0 – 50` | Historical fraud disputes logged | `6` |
| `is_high_risk` | `BOOLEAN` | `0` or `1` | Flag for elevated review tier | `1` |

### 4.3. `devices.csv`
| Column Name | Data Type | Range / Format | Description | Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `device_id` | `VARCHAR(16)` | `DEV-[10001-99999]` | Primary key; unique device identifier | `DEV-20491` |
| `device_type` | `ENUM` | `mobile`, `tablet`, `desktop` | Hardware category | `mobile` |
| `operating_system` | `ENUM` | `Android`, `iOS`, `Windows`, `macOS` | OS platform | `Android` |
| `device_age_days` | `INT` | `1 – 1800` | Days since first observed in network | `12` |
| `customers_using_device`| `INT` | `1 – 25` | Distinct customers sharing this device | `4` |
| `device_location` | `VARCHAR(32)` | Indian cities / IP Geo | Geo-location of device IP | `New Delhi` |
| `ip_risk_score` | `NUMERIC(5,2)` | `0.00 – 100.00` | IP reputation score | `82.00` |
| `device_risk_score`| `NUMERIC(5,2)` | `0.00 – 100.00` | Hardware anomaly score | `75.00` |
| `is_emulator` | `BOOLEAN` | `0` or `1` | Emulator signature detected | `1` |
| `is_rooted_or_modified`| `BOOLEAN`| `0` or `1` | Jailbreak / Root / Debugging detected | `1` |

### 4.4. `behavioral_profiles.csv`
| Column Name | Data Type | Range / Format | Description | Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `profile_id` | `VARCHAR(16)` | `BP-[1001-99999]` | Primary key | `BP-1001` |
| `customer_id` | `VARCHAR(16)` | FK to `customers.customer_id` | Associated customer | `MR-1001` |
| `normal_mean_tx_amount`| `NUMERIC(10,2)`| `₹200 – ₹50,000` | Baseline average transaction value | `3500.00` |
| `normal_std_tx_amount` | `NUMERIC(10,2)`| `₹100 – ₹25,000` | Standard deviation of transaction value | `1200.00` |
| `normal_daily_frequency`| `NUMERIC(4,2)` | `0.10 – 15.00` | Typical daily transaction count | `1.50` |
| `normal_active_hours_start`| `INT` | `0 – 23` | Typical earliest transaction hour (IST) | `8` |
| `normal_active_hours_end` | `INT` | `0 – 23` | Typical latest transaction hour (IST) | `22` |
| `normal_home_location` | `VARCHAR(32)` | City name | Primary transacting location | `Bengaluru` |
| `primary_device_id` | `VARCHAR(16)` | FK to `devices.device_id` | Familiar primary hardware | `DEV-10001` |
| `normal_top_category` | `ENUM` | Merchant/Transfer categories | Most frequent spending category | `essential` |

### 4.5. `transactions.csv`
| Column Name | Data Type | Range / Format | Description | Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `transaction_id` | `VARCHAR(16)` | `TX-[100001-999999]` | Primary key | `TX-492019` |
| `customer_id` | `VARCHAR(16)` | FK to `customers.customer_id` | Initiating / focal customer | `MR-1001` |
| `timestamp` | `TIMESTAMP` | ISO-8601 with `+05:30` | Execution time | `2026-09-13T14:02:00+05:30` |
| `amount` | `NUMERIC(12,2)` | `₹10.00 – ₹5,00,000.00` | Transaction value in INR | `47000.00` |
| `direction` | `ENUM` | `in`, `out` | Flow relative to customer account | `out` |
| `channel` | `ENUM` | `UPI`, `Wallet`, `Card`, `Digital banking` | Payment rail | `UPI` |
| `counterparty` | `VARCHAR(64)` | Entity / Beneficiary name | Beneficiary or remitter name | `New beneficiary B-482` |
| `account` | `VARCHAR(64)` | Sluggified account/VPA identifier | Counterparty account reference | `b-482-paytm` |
| `category` | `ENUM` | `salary`, `essential`, `transfer`, `credit`, `emi` | Accounting classification | `transfer` |
| `status` | `ENUM` | `Completed`, `Pending` | Settlement state | `Completed` |
| `merchant_id` | `VARCHAR(16)` | FK to `merchants.merchant_id` | Merchant ID if applicable (null for P2P) | `NULL` |
| `device_id` | `VARCHAR(16)` | FK to `devices.device_id` | Originating hardware device | `DEV-20491` |
| `location` | `VARCHAR(32)` | City name | Geo-location at initiation | `Jaipur` |
| `is_new_device` | `BOOLEAN` | `0` or `1` | First-seen device for this customer | `1` |
| `is_new_location` | `BOOLEAN` | `0` or `1` | Geographically anomalous location | `1` |
| `is_new_beneficiary`| `BOOLEAN` | `0` or `1` | Beneficiary first-time interaction | `1` |
| `is_unusual_time` | `BOOLEAN` | `0` or `1` | Outside customer's normal hour window | `0` |
| `tx_freq_last_1h` | `INT` | `0 – 50` | Transactions by customer in past 60 min | `2` |
| `tx_freq_last_24h` | `INT` | `0 – 100` | Transactions by customer in past 24 hrs | `3` |
| `amount_to_avg_ratio`| `NUMERIC(6,2)` | `0.01 – 50.00` | Ratio: `amount / normal_mean_tx_amount` | `13.43` |
| `behavioral_anomaly_score`| `NUMERIC(5,2)` | `0.00 – 100.00` | Unsupervised baseline deviation | `84.50` |
| `merchant_risk_score`| `NUMERIC(5,2)` | `0.00 – 100.00` | Score inherited from merchant (or 0) | `0.00` |
| `device_risk_score` | `NUMERIC(5,2)` | `0.00 – 100.00` | Score inherited from device | `75.00` |
| `observed_signals` | `VARCHAR(255)` | Semicolon-delimited strings | Human-readable anomaly indicators | `New beneficiary; 13.4x usual transfer; Unusual device` |
| `simulated_tx_risk` | `INT` | `0 – 100` | Composite transaction-level risk | `89` |
| `known_at` | `TIMESTAMP` | ISO-8601 (null for immediate) | Timestamp when pending tx was committed | `NULL` |
| **`is_fraud`** *(Target)*| `INT` | `0` (legitimate) or `1` (fraudulent) | Ground truth fraud label | `1` |
| **`scam_type`** *(Target)*| `INT` | `0`–`6` (0=legit, 1=impersonation, 2=phishing, 3=fake_refund, 4=investment, 5=mule, 6=payment_request) | Specific scam taxonomy | `1` |

### 4.6. `loans.csv`
| Column Name | Data Type | Range / Format | Description | Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `loan_id` | `VARCHAR(16)` | `LN-[10001-99999]` | Primary key | `LN-50192` |
| `customer_id` | `VARCHAR(16)` | FK to `customers.customer_id` | Borrowing customer | `MR-1001` |
| `loan_type` | `ENUM` | `personal`, `education`, `vehicle`, `consumer`, `business` | Credit product type | `personal` |
| `principal` | `NUMERIC(12,2)` | `₹20,000 – ₹20,00,000` | Original disbursed facility amount | `360000.00` |
| `interest_rate_pct`| `NUMERIC(4,2)` | `8.50% – 24.00%` | Annual percentage interest rate | `12.50` |
| `tenure_months` | `INT` | `6 – 84` | Total loan term in months | `24` |
| `monthly_emi` | `NUMERIC(10,2)` | `₹1,000 – ₹1,00,000` | Contractual monthly installment | `18000.00` |
| `loan_start_date` | `DATE` | `YYYY-MM-DD` | Disbursal date | `2026-03-27` |
| `loan_end_date` | `DATE` | `YYYY-MM-DD` | Maturity date | `2028-03-27` |
| `due_day_of_month`| `INT` | `1 – 28` | Day of month EMI is due | `27` |
| `salary_day_of_month`| `INT` | `1 – 28` | Expected monthly salary credit day | `1` |
| `outstanding_balance`| `NUMERIC(12,2)`| `₹0 – ₹20,00,000` | Remaining principal balance | `312000.00` |
| `loan_status` | `ENUM` | `Active`, `Closed`, `Defaulted` | Current contract lifecycle state | `Active` |
| **`loan_risk_class`** *(Target)*| `INT` | `0` (low), `1` (medium), `2` (high) | Ground truth repayment distress class | `2` |

### 4.7. `repayments.csv`
| Column Name | Data Type | Range / Format | Description | Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `repayment_id` | `VARCHAR(16)` | `RP-[100001-999999]` | Primary key | `RP-301920` |
| `loan_id` | `VARCHAR(16)` | FK to `loans.loan_id` | Associated loan contract | `LN-50192` |
| `customer_id` | `VARCHAR(16)` | FK to `customers.customer_id` | Borrowing customer | `MR-1001` |
| `installment_num` | `INT` | `1 – 84` | Installment sequence number | `7` |
| `due_date` | `DATE` | `YYYY-MM-DD` | Contractual due date | `2026-09-27` |
| `payment_date` | `DATE` | `YYYY-MM-DD` (null if unpaid) | Actual settlement date | `NULL` |
| `amount_due` | `NUMERIC(10,2)` | `₹1,000 – ₹1,00,000` | Scheduled EMI installment | `18000.00` |
| `amount_paid` | `NUMERIC(10,2)` | `₹0 – ₹1,00,000` | Amount credited towards installment | `0.00` |
| `days_delayed` | `INT` | `0 – 180` | Days late relative to `due_date` | `0` |
| `missed_payment` | `BOOLEAN` | `0` or `1` | Unpaid >30 days past due | `0` |
| `partial_payment`| `BOOLEAN` | `0` or `1` | Paid `< amount_due` | `0` |
| `remaining_balance`| `NUMERIC(12,2)`| `₹0 – ₹20,00,000` | Loan balance after installment | `312000.00` |
| `repayment_status`| `ENUM` | `on_time`, `late`, `partial`, `missed`, `defaulted`, `upcoming` | Installment performance status | `upcoming` |

### 4.8. `customer_events.csv`
| Column Name | Data Type | Range / Format | Description | Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `event_id` | `VARCHAR(16)` | `EV-[100001-999999]` | Primary key | `EV-1003` |
| `customer_id` | `VARCHAR(16)` | FK to `customers.customer_id` | Target customer | `MR-1001` |
| `timestamp` | `TIMESTAMP` | ISO-8601 with `+05:30` | Observation time | `2026-09-13T14:08:00+05:30` |
| `title` | `VARCHAR(64)` | Concise headline | Short event summary | `Two transfers · six minutes apart` |
| `detail` | `TEXT` | Detailed context | Narrative description with amounts | `₹47,000 at 14:02 and ₹31,000 at 14:08 to B-482...` |
| `kind` | `ENUM` | `baseline`, `device`, `transfer`, `liquidity`, `income`, `verification` | Event categorization for V1 rendering | `transfer` |
| `transaction_ids` | `VARCHAR(128)` | Delimited list of IDs | Linked transactions | `TX-492019;TX-492020` |

---

## 5. Mapping of Dataset to V1 (Meridian)

The table below describes how the relational synthetic data maps into the runtime TypeScript models in `src/types.ts`, the ledger calculator in `src/selectors.ts`, and the context engine in `src/context.ts`.

| V1 Model / Target Field | V1 TypeScript Type | Source Table & Column | Mapping / Transformation Logic |
| :--- | :--- | :--- | :--- |
| **`Customer.id`** | `string` | `customers.customer_id` | Direct 1:1 string match (`MR-1001`). |
| **`Customer.name`** | `string` | `customers.name` | Direct string copy. |
| **`Customer.occupation`** | `string` | `customers.occupation` | Direct string copy. |
| **`Customer.city`** | `string` | `customers.city` | Direct string copy. |
| **`Customer.salary`** | `number` | `customers.monthly_income` | Converted to numeric float. |
| **`Customer.expenses`** | `number` | `customers.monthly_expense` | Converted to numeric float. |
| **`Customer.openingCash`**| `number` | `customers.opening_cash` | Initial liquid balance for ledger reconciliations. |
| **`Customer.openingCredit`**| `number` | `customers.opening_credit` | Initial drawn credit liability. |
| **`Customer.creditLimit`**| `number` | `customers.credit_limit` | Denominator for `utilization = (creditUsed / creditLimit) * 100`. |
| **`Customer.usualTransfer`**| `number`| `customers.usual_transfer_amount` | Baseline transfer size (used for `5x` shock threshold). |
| **`Customer.loan`** | `object` | `loans` joined with `repayments` | Active loan details + past 3-month history: |
| `Customer.loan.principal`| `number` | `loans.principal` | Active loan principal. |
| `Customer.loan.emi` | `number` | `loans.monthly_emi` | Contractual monthly installment. |
| `Customer.loan.dueAt` | `string` | Formatted ISO string | `loans.due_day_of_month` + current month (`2026-09-27T12:00:00+05:30`). |
| `Customer.loan.salaryAt` | `string` | Formatted ISO string | `loans.salary_day_of_month` + next month (`2026-10-01T09:00:00+05:30`). |
| `Customer.loan.history` | `Array<{month, status, daysLate}>` | `repayments` (historical) | Past 3 closed installments (`Paid`/`Late`/`Missed`). |
| **`Transaction.id`** | `string` | `transactions.transaction_id` | Direct string match. |
| **`Transaction.at`** | `string` | `transactions.timestamp` | ISO-8601 string (`2026-09-13T14:02:00+05:30`). |
| **`Transaction.amount`** | `number` | `transactions.amount` | Converted to numeric float. |
| **`Transaction.direction`**| `'in' \| 'out'` | `transactions.direction` | Direct enum mapping. |
| **`Transaction.channel`** | `Channel` | `transactions.channel` | Mapped to `'UPI' \| 'Wallet' \| 'Card' \| 'Digital banking'`. |
| **`Transaction.counterparty`**| `string` | `transactions.counterparty` | Direct string copy. |
| **`Transaction.account`** | `string` | `transactions.account` | Lowercase sluggified account name. |
| **`Transaction.category`**| `category` | `transactions.category` | `'salary' \| 'essential' \| 'transfer' \| 'credit' \| 'emi'`. |
| **`Transaction.status`** | `'Completed' \| 'Pending'` | `transactions.status` | Mapped directly. |
| **`Transaction.signals`** | `string[]` | `transactions.observed_signals` | Semicolon-split string into array of strings. |
| **`Transaction.risk`** | `number` | `transactions.simulated_tx_risk`| Numeric score (0–100). |
| **`Transaction.newBeneficiary`**| `boolean` | `transactions.is_new_beneficiary`| Boolean flag. |
| **`Transaction.unusualDevice`**| `boolean`| `transactions.is_new_device` | Boolean flag. |
| **`Transaction.knownAt`**| `string \| undefined` | `transactions.known_at` | Timestamp when pending essential instruction was committed. |
| **`CustomerEvent`** | `object` | `customer_events` | 1:1 mapping of `id`, `at`, `title`, `detail`, `kind`, `transactionIds`. |
| **`FinancialState`** | Dynamic calculation | `src/selectors.ts:financialState(c, asOf)` | Computed ledger state using as-of settled transactions: |
| `FinancialState.cash` | `number` | Computed from transactions | `openingCash + sum(in) - sum(out)`. Invariant: always `≥ 0`. |
| `FinancialState.creditUsed`| `number` | Computed from credit draws | `openingCredit + sum(credit in)`. Raises both cash and liability. |
| `FinancialState.suspectedOutflow`| `number` | Computed from transactions | Sum of outgoing completed tx with `risk ≥ 70`, new beneficiary & device. |
| `FinancialState.fundsForEmi` | `number` | Computed | `max(0, cash - essentialsBeforeEmi)`. |
| `FinancialState.shortfall`| `number` | Computed | `max(0, loan.emi - fundsForEmi)`. Forecasted before salary. |
| `FinancialState.daysPastDue`| `number`| Computed | `max(0, floor((asOf - loan.dueAt) / 86400000))` if unpaid. |
| **`RiskSnapshot`** | Score Provider | `src/scoring.ts` & ML Output | Replaces simulated points with dual ML model scores: |
| `RiskSnapshot.scamScore` | `number (0–100)` | Fraud/Scam ML Model | Calibrated probability normalized to 0–100. |
| `RiskSnapshot.repaymentScore`| `number (0–100)`| Loan Risk ML Model | Calibrated probability normalized to 0–100. |
| `RiskSnapshot.episode` | `object` | Peak tracking logic | Tracks open scam episode peak (`peak`, `observedAt`, `windowStart`). |
| **`InferenceInput`** | Feature Pipeline | Documented in `V2_HANDOFF.md` | Strict as-of feature vector: `(customerId, asOf, observedTx, observedEvents, financialState, loanSchedule)`. |

---

## 6. Proposed Synthetic-Data Generation Strategy

### 6.1. Scale & Reproducibility
- **Development Seed Tier**:
  - `5,000` Customers
  - `25,000` Transactions
  - `1,000` Merchants
  - `2,000` Devices
  - `2,000` Loans
  - `10,000+` Repayment records
- **Production Scalability**:
  Parametric architecture configured via `--scale dev` vs `--scale prod` supporting `50,000` customers and `200,000+` transactions without code modifications.
- **Reproducibility**:
  Central random seed:
  ```python
  RANDOM_SEED = 42
  ```

### 6.2. Realistic Indian Fintech Context
- **Currency**: Primary currency strictly in Indian Rupee (**INR / ₹**).
- **Payment Rails Distribution**:
  - **UPI (65%)**: Daily micro & medium ticket transactions (P2P splits, groceries, small merchants; ₹10 – ₹50,000).
  - **Digital Banking (15%)**: NEFT / RTGS / IMPS for high-value salaries, rent, and investments (₹25,000 – ₹5,00,000).
  - **Cards (15%)**: Credit/Debit cards for e-commerce, dining, electronics (₹500 – ₹1,00,000).
  - **Wallets (5%)**: Micro-recharges and local transport (₹50 – ₹3,000).
- **Urban Income Tiers**:
  - *Tier 1 (Junior / Gig)*: ₹15,000 – ₹40,000/month; lower liquid buffer.
  - *Tier 2 (Mid-Level Salaried)*: ₹40,000 – ₹1,20,000/month; stable savings, moderate loan EMIs.
  - *Tier 3 (Senior / HNI)*: ₹1,20,000 – ₹5,00,000/month; high credit limits, larger discretionary spending.
- **Credit Facilities**:
  - Personal loans (unsecured, 12%–18% APR).
  - Consumer durable EMIs (6–12 months).
  - Two-wheeler / vehicle loans (24–48 months).
  - Education loans.

### 6.3. Financial Trajectories & Customer Archetypes (180-Day Simulation)

| Archetype | Portfolio Share | Behavior Pattern | Expected Model Response |
| :--- | :--- | :--- | :--- |
| **Healthy Customer** | 70% | Consistent salary credit, regular essential expenses (30–50% of income), stable cash buffer, 100% on-time EMI repayments. | Scam Risk `<20`, Repayment Risk `<25`. Context: `Healthy`. |
| **Scam Shock → Liquidity Shock** | 5% | Normal baseline suddenly interrupted by high-velocity fraudulent outflow (e.g. ₹78,000 in two rapid transfers). Resulting buffer depletion causes EMI shortfall before the next salary. | Scam Risk `>85`, Repayment Risk climbs `17 → 68`. Context: `Possible scam-linked distress`. |
| **Organic Distress** | 8% | Salary delayed or reduced without any fraudulent outflow. Customer draws emergency credit to meet basic expenses; debt-to-income increases. | Scam Risk `<15`, Repayment Risk climbs `>70`. Context: `Organic distress`. |
| **Mule Account** | 3% | Fan-in pattern: 3–5 unrelated accounts transfer ₹20,000–₹35,000 within minutes, followed by an immediate 85–95% onward pass-through. | Scam/Mule Risk `>85`, Repayment Risk normal. Context: `Possible mule`. |
| **Mild / Transient Distress** | 9% | Single late payment (1–15 days late) caused by temporary expense spike, followed by self-cure upon salary receipt. | Moderate Repayment Risk (`30–45`), Low Scam Risk. Context: `Routine monitoring`. |
| **Ambiguous / Conflicting** | 5% | Large legitimate payment (e.g., property deposit) from a familiar device, or coincidence of minor scam with an independent income interruption. | Triggers manual review routing. Context: `Uncertain / manual review`. |

### 6.4. Scam Simulation Mechanics (Problem Statement Taxonomy)
1. **Impersonation (Class 1)**: Urgent transfer to newly added beneficiary claiming to be an authority, friend, or legal official; often initiated shortly after unusual communication.
2. **Phishing (Class 2)**: Account accessed from an unrecognized device, anomalous IP, or strange hour, followed by rapid OTP draining and session anomalies.
3. **Fake Refund (Class 3)**: Small inbound credit masquerading as a refund, followed by an urgent claim of "accidental excess transfer" and immediate reverse transfer of a much larger sum.
4. **Investment Scam (Class 4)**: Progressive series of payments into high-risk investment merchant categories with escalating amounts over 7–14 days.
5. **Mule Account (Class 5)**: Inbound fan-in velocity from multiple unlinked accounts followed by rapid bulk outward transfer within 10–20 minutes.
6. **Payment Request Scam (Class 6)**: Inverted UPI collect-request scam where customer enters UPI PIN expecting to receive funds, resulting in unexpected debit.

### 6.5. Anti-Leakage & Realism Guarantees
- **No Trivial Heuristic Separability**:
  - Legitimate users make large purchases (e.g. jewelry, electronics, down payments).
  - Legitimate users purchase new devices.
  - Fraud transactions can be small testing amounts (e.g., ₹1,500).
  - Fraud can occur on familiar devices (social engineering scams).
  - High-risk merchants have legitimate customers.
- **Zero Target Leakage**:
  - `loan_risk_class` (0, 1, 2) is derived from true simulated future installment defaults (e.g., unpaid EMI 30 days post-due), never from an arbitrary concurrent score variable.
  - Features for time $T$ are computed strictly using historical transactions $t \le T$.
- **Mathematical Ledger Invariant**:
  $$\text{Cash}_t = \text{OpeningCash} + \sum_{i \le t, \text{Completed}} (\text{In}_i - \text{Out}_i) \ge 0$$
  Credit draws increase both cash and liability (`creditUsed`).

---

## 7. Approval Gate

Per the project prompt:
> *"Do not write the generator yet. Do not modify the existing V1. Wait for approval before implementing the dataset generator."*

The complete specification is saved and ready for team sign-off.
