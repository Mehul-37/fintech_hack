"""Seeded, coherent financial simulation. All identities and outcomes are fictional."""
import argparse
import calendar
import csv
import hashlib
import json
import random
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

IST = timezone(timedelta(hours=5, minutes=30))
START = datetime(2026, 8, 1, tzinfo=IST)
COHORTS = ['buffered_scam', 'recovered_scam', 'familiar_device_scam', 'small_scam',
           'legitimate_large', 'new_device_legitimate', 'prior_distress_unrelated_scam',
           'income_gap', 'conflicting', 'same_sender', 'pooled_payments', 'multiple_episodes']

def write_csv(path, rows):
    fields = list(dict.fromkeys(k for row in rows for k in row))
    with path.open('w', newline='', encoding='utf-8') as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

def generate(customers=2000, history_days=60, followup_days=37, seed=42, output='data/synthetic'):
    rng = random.Random(seed)
    tables = {k: [] for k in ['customers', 'behavioral_profiles', 'devices', 'merchants',
                              'transactions', 'customer_events', 'loans', 'repayments']}
    days = history_days + followup_days
    for j in range(400):
        tables['merchants'].append(dict(merchant_id=f'MCH-{j+10000}', merchant_name=f'Merchant {j+1}',
            merchant_category=['retail','utilities','food','healthcare'][j%4],
            merchant_location='Online', merchant_age_days=rng.randint(30,2000),
            merchant_risk_score=round(rng.uniform(0,75),2), previous_fraud_reports=0,
            is_high_risk=int(j%17==0)))
    for i in range(customers):
        cid = f'SYN-{i+10000}'
        cohort = COHORTS[i % len(COHORTS)] if i < 360 else rng.choices(
            ['healthy','scam_shock','organic_distress','mild_distress','mule','ambiguous'],
            [65,9,10,8,3,5])[0]
        income = rng.randrange(25000,130001,1000)*100
        expenses = int(income*rng.uniform(.35,.65))
        cash = int(income*rng.uniform(.2,2.0))
        if cohort == 'buffered_scam': cash += 3*income
        opening = cash
        credit = rng.randrange(0,5001,500)*100
        limit = int(income*rng.uniform(.4,1.3))
        primary = f'DEV-{10000+i}'
        replacement = f'DEV-{10000+customers+i//5}'
        typical = rng.randrange(1000,6001,100)*100
        due_day = rng.randint(20,28)
        salary_day = rng.choice([1,1,1,5,28])
        distress = cohort in ['organic_distress','income_gap','prior_distress_unrelated_scam','conflicting']
        scam = cohort in ['scam_shock','buffered_scam','recovered_scam','familiar_device_scam',
                          'small_scam','prior_distress_unrelated_scam','conflicting','multiple_episodes']
        shock_day = rng.randint(39,51)
        customer = dict(customer_id=cid,name=f'Synthetic customer {i+1}',occupation='Salaried',
            city=['Delhi','Mumbai','Bengaluru','Jaipur'][i%4],monthly_income=income/100,
            monthly_expense=expenses/100,opening_cash=opening/100,opening_cash_paise=opening,
            opening_credit=credit/100,credit_limit=limit/100,usual_transfer_amount=typical/100,
            preferred_channel='UPI',financial_trajectory=cohort,salary_day_of_month=salary_day)
        tables['customers'].append(customer)
        tables['devices'].append(dict(device_id=primary,device_type='mobile',operating_system='Android',
            device_age_days=rng.randint(10,1000),device_risk_score=round(rng.uniform(0,65),2),
            customers_using_device=1,is_emulator=0,is_rooted_or_modified=0))
        if i%5==0:
            tables['devices'].append(dict(device_id=replacement,device_type='mobile',operating_system='Android',
                device_age_days=rng.randint(1,100),device_risk_score=round(rng.uniform(5,85),2),
                customers_using_device=5,is_emulator=0,is_rooted_or_modified=0))
        tables['behavioral_profiles'].append(dict(profile_id=f'BP-{i}',customer_id=cid,
            normal_mean_tx_amount=typical/100,normal_std_tx_amount=typical/200,
            primary_device_id=primary,normal_daily_frequency=10/30,
            normal_active_hours_start=7,normal_active_hours_end=23))
        local = []
        def add(day, amount, direction, category, fraud=0, new=False, device=False,
                account=None, minute=None, loan_id='', installment=0, known_at='', status='Completed'):
            nonlocal cash, credit
            amount = int(amount)
            if status=='Completed' and direction=='out': amount = min(amount,cash)
            if amount <= 0: return None
            stamp = START+timedelta(days=day-1,minutes=minute if minute is not None else rng.randint(540,1320))
            tid=f'TX-{100000+len(tables["transactions"])}'
            row=dict(transaction_id=tid,customer_id=cid,timestamp=stamp.isoformat(),amount=amount/100,
                amount_paise=amount,direction=direction,category=category,status=status,known_at=known_at,
                channel=rng.choices(['UPI','Card','Wallet','Digital banking'],[65,15,5,15])[0],
                counterparty='Payment counterparty',account=account or f'party-{rng.randint(1,6)}',
                merchant_id='' if category=='transfer' else f'MCH-{10000+i%400}',
                device_id=replacement if device else primary,location=customer['city'],
                is_new_device=int(device),is_new_beneficiary=int(new),
                is_unusual_time=int(stamp.hour<7 or stamp.hour>=23),is_new_location=int(device and rng.random()<.4),
                is_fraud=fraud,scam_type=rng.randint(1,4) if fraud else 0,
                loan_id=loan_id,installment_num=installment,observed_signals='')
            if status=='Completed':
                cash += amount if direction=='in' else -amount
                if category=='credit' and direction=='in': credit += amount
            local.append(row)
            tables['transactions'].append(row)
            return tid
        active=[]
        number = 0 if i%10==0 else (2 if i%10==1 else 1)
        for n in range(number):
            principal=int(income*rng.uniform(2,8))
            rate=rng.uniform(.10,.20)/12
            tenure=rng.choice([12,24,36])
            emi=int(round(principal*rate/(1-(1+rate)**-tenure)))
            lid=f'LN-{i}-{n}'
            loan=dict(loan_id=lid,customer_id=cid,principal=principal/100,interest_rate_pct=round(rate*1200,4),
                tenure_months=tenure,monthly_emi=emi/100,monthly_emi_paise=emi,
                due_day_of_month=due_day,loan_start_date='2026-07-01',loan_status='Active',
                outstanding_balance=principal/100)
            tables['loans'].append(loan)
            active.append(dict(loan=loan,outstanding=principal,emi=emi))
        installments=[]
        for day in range(1,days+1):
            date=START+timedelta(days=day-1)
            month_offset=(date.year-START.year)*12+date.month-START.month
            if date.day==salary_day:
                salary=int(income*(rng.uniform(.12,.65) if distress and day>30 else rng.uniform(.92,1.08)))
                if not (cohort=='income_gap' and month_offset==1): add(day,salary,'in','salary',account='employer',minute=540)
            if date.day in [3,9,15,21,26]:
                essential=int(expenses/5*rng.uniform(.85,1.15))
                if cash<essential and credit<limit:
                    add(day,min(essential-cash,limit-credit),'in','credit',account='credit-line',minute=550)
                add(day,essential,'out','essential',minute=600)
            if date.day in [7,17,23]:
                unusual = rng.random()<.15
                amount=int(typical*rng.uniform(.3,2.8))
                if cohort=='legitimate_large' and date.day==17 and month_offset==1: amount=int(cash*.75)
                if rng.random()<.05: amount=int(cash*rng.uniform(.35,.85))
                add(day,amount,'out','transfer',new=unusual or rng.random()<.15,
                    device=cohort=='new_device_legitimate' or rng.random()<.08)
            if scam and day in ([shock_day,shock_day+6] if cohort=='multiple_episodes' else [shock_day]):
                amount=int(cash*(rng.uniform(.65,.94) if cohort not in ['small_scam','buffered_scam'] else rng.uniform(.05,.20)))
                unfamiliar=cohort!='familiar_device_scam' and rng.random()<.7
                add(day,int(amount*.6),'out','transfer',fraud=1,new=rng.random()<.85,device=unfamiliar,account=f'party-{rng.randint(7,30)}',minute=842)
                add(day,int(amount*.4),'out','transfer',fraud=1,new=True,device=unfamiliar,account=f'party-{rng.randint(7,30)}',minute=848)
            if cohort=='recovered_scam' and day==shock_day+3:
                losses=sum(t['amount_paise'] for t in local if t['is_fraud'])
                add(day,int(losses*.95),'in','transfer',account='recovery',minute=600)
            if cohort in ['mule','same_sender','pooled_payments'] and day==shock_day:
                total=0
                for k in range(3):
                    amount=rng.randrange(15000,30001,100)*100
                    total+=amount
                    add(day,amount,'in','transfer',fraud=int(cohort=='mule'),new=True,
                        account='sender-1' if cohort=='same_sender' else f'sender-{k}',minute=840+k*3)
                add(day,int(total*.9),'out','transfer',fraud=int(cohort=='mule'),new=True,account='party-21',minute=854)
            if date.day==due_day:
                for n,a in enumerate(active):
                    due=a['emi']
                    interest=int(round(a['outstanding']*a['loan']['interest_rate_pct']/1200))
                    row=dict(repayment_id=f'RP-{i}-{month_offset}-{n}',loan_id=a['loan']['loan_id'],
                        customer_id=cid,installment_num=month_offset+2,due_date=date.date().isoformat(),
                        amount_due=due/100,amount_due_paise=due,amount_paid=0,amount_paid_paise=0,
                        payment_date='',payment_transaction_ids='',days_delayed=0,repayment_status='upcoming',
                        principal_before_paise=a['outstanding'],interest_due_paise=interest)
                    installments.append(dict(row=row,remaining=due,due_day=day,account=a,paid_interest=0))
                    tables['repayments'].append(row)
            for inst in installments:
                age=day-inst['due_day']
                if inst['remaining']<=0 or age<0: continue
                if age and age%3: continue
                # Cash-constrained payment and stochastic willingness, not an assigned risk class.
                reserve=int(expenses*rng.uniform(.12,.4))
                available=max(0,cash-reserve)
                reluctant=cohort=='mild_distress' and age<rng.choice([3,6,9])
                if rng.random()<.04 or reluctant: available=0
                amount=min(inst['remaining'],available)
                tid=add(day,amount,'out','emi',loan_id=inst['row']['loan_id'],
                    installment=inst['row']['installment_num'],account='lender',minute=1350)
                if tid:
                    row=inst['row']
                    inst['remaining']-=amount
                    row['amount_paid_paise']+=amount
                    row['amount_paid']=row['amount_paid_paise']/100
                    row['payment_date']=date.date().isoformat()
                    row['payment_transaction_ids']=(row['payment_transaction_ids']+';'+tid).strip(';')
                    row['days_delayed']=age
                    interest_paid=min(amount,max(0,row['interest_due_paise']-inst['paid_interest']))
                    inst['paid_interest']+=interest_paid
                    inst['account']['outstanding']=max(0,inst['account']['outstanding']-(amount-interest_paid))
                inst['row']['repayment_status']='on_time' if inst['remaining']==0 and age==0 else 'late' if inst['remaining']==0 else 'partial' if inst['row']['amount_paid_paise'] else 'missed'
        # Explicitly known commitments at the end of the history, not future settled evidence.
        if active:
            amount=int(expenses*.15)
            add(history_days+2,amount,'out','essential',known_at=(START+timedelta(days=history_days-3)).isoformat(),status='Pending',minute=720)
        for t in local:
            if t['category']=='transfer' and t['status']=='Completed':
                tables['customer_events'].append(dict(event_id=f'EV-{t["transaction_id"]}',customer_id=cid,
                    timestamp=t['timestamp'],kind='transfer',title='Payment observed',detail='Review payment evidence',transaction_ids=t['transaction_id']))
    tables['transactions'].sort(key=lambda t:(t['customer_id'],t['timestamp'],t['transaction_id']))
    dest=Path(output);dest.mkdir(parents=True,exist_ok=True)
    for name,rows in tables.items(): write_csv(dest/f'{name}.csv',rows)
    cutoff=START+timedelta(days=history_days)
    history=[t for t in tables['transactions'] if datetime.fromisoformat(t['timestamp'])<cutoff and t['status']=='Completed']
    manifest=dict(schema_version='meridian-synthetic-2.0',seed=seed,start=START.isoformat(),
        history_cutoff=(cutoff-timedelta(milliseconds=1)).isoformat(),followup_cutoff=(START+timedelta(days=days)-timedelta(milliseconds=1)).isoformat(),
        currency='INR',authoritative_money='integer paise',counts={k:len(v) for k,v in tables.items()},
        history_transactions=len(history),followup_transactions=sum(t['status']=='Completed' for t in tables['transactions'])-len(history),
        pending_transactions=sum(t['status']=='Pending' for t in tables['transactions']),
        cohort_counts=dict(Counter(c['financial_trajectory'] for c in tables['customers'])),
        hashes={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(dest.glob('*.csv'))},
        limitations=['All synthetic; no real population calibration','60 history days; temporal generalization unverified',
                      'Reputation fields are opening assumptions; no downstream feature uses full-run summary'])
    (dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print(json.dumps({k:manifest[k] for k in ['counts','history_transactions','followup_transactions','pending_transactions']}))
    return manifest

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--customers',type=int,default=2000)
    p.add_argument('--history-days',type=int,default=60);p.add_argument('--followup-days',type=int,default=37)
    p.add_argument('--seed',type=int,default=42);p.add_argument('--output',default='data/synthetic')
    args=p.parse_args();generate(**vars(args))
