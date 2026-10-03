"""Shared numerical feature contract; labels and future simulator truth never enter inputs."""
import csv
from collections import defaultdict
from datetime import datetime, timedelta, time
from pathlib import Path

FRAUD_FEATURES=['amount_ratio','new_beneficiary','new_device','unusual_hour','velocity_1h',
                'velocity_24h','cash_fraction','incoming_senders_20m','pass_through','outgoing']
REPAYMENT_FEATURES=['cash_coverage','funds_coverage','commitment_coverage','salary_coverage',
                    'expense_ratio','credit_utilization','days_to_due','salary_after_due_days',
                    'past_late_fraction','past_missed_count','income_gap','credit_draw_coverage']

def ratio(a,b): return max(0,min(50,a/max(1,b)))
def dt(s): return datetime.fromisoformat(s)
def label_cutoff(due_date):
    return dt(due_date+'T23:59:59.999999+05:30')+timedelta(days=7)
def repayment_target(repayment, rows, observed_through):
    cutoff=label_cutoff(repayment['due_date'])
    if cutoff>observed_through: return None
    paid=sum(int(t['amount_paise']) for t in settled(rows,cutoff)
        if t.get('loan_id')==repayment['loan_id'] and str(t.get('installment_num'))==str(repayment['installment_num']))
    return int(paid<int(repayment['amount_due_paise']))
def settled(rows,at): return [t for t in rows if t['status']=='Completed' and dt(t['timestamp'])<=at]
def balance(customer,rows):
    return float(customer['opening_cash'])+sum(float(t['amount'])*(1 if t['direction']=='in' else -1) for t in rows)

def fraud_features(c,t,rows):
    at=dt(t['timestamp']); previous=[r for r in rows if dt(r['timestamp'])<at and r['status']=='Completed']
    hour=[r for r in previous if (at-dt(r['timestamp'])).total_seconds()<=3600]
    day=[r for r in previous if (at-dt(r['timestamp'])).total_seconds()<=86400]
    incoming=[r for r in previous if r['direction']=='in' and r['category']=='transfer' and (at-dt(r['timestamp'])).total_seconds()<=1200]
    return [ratio(float(t['amount']),float(c['usual_transfer_amount'])),int(t['is_new_beneficiary']),
            int(t['is_new_device']),int(at.hour<7 or at.hour>=23),len(hour),len(day),
            ratio(float(t['amount']),balance(c,previous)),len({r['account'] for r in incoming}),
            ratio(float(t['amount']),sum(float(r['amount']) for r in incoming)) if incoming and t['direction']=='out' else 0,
            int(t['direction']=='out')]

def repayment_features(c,loan,rows,repayments,at,due):
    seen=settled(rows,at); cash=balance(c,seen);emi=float(loan['monthly_emi'])
    pending=sum(float(t['amount']) for t in rows if t['status']=='Pending' and t['known_at'] and dt(t['known_at'])<=at<dt(t['timestamp'])<due and t['category']=='essential')
    credit=float(c['opening_credit'])+sum(float(t['amount']) for t in seen if t['category']=='credit' and t['direction']=='in')
    draws=sum(float(t['amount']) for t in seen if t['category']=='credit' and (at-dt(t['timestamp'])).days<30)
    past=[]
    for r in repayments:
        cutoff=label_cutoff(r['due_date'])
        if dt(r['due_date']+'T12:00:00+05:30')>at:continue
        paid=sum(int(t['amount_paise']) for t in seen if t.get('loan_id')==r['loan_id'] and str(t.get('installment_num'))==str(r['installment_num']) and dt(t['timestamp'])<=cutoff)
        if paid>=int(r['amount_due_paise']):past.append(False)
        elif cutoff<at:past.append(True)
    salary_day=int(c['salary_day_of_month'])
    salary_date=at.replace(day=salary_day,hour=9,minute=0,second=0,microsecond=0)
    if salary_date<=at:
        year=at.year+(at.month==12);month=at.month%12+1
        salary_date=salary_date.replace(year=year,month=month)
    month_salary=sum(float(t['amount']) for t in seen if t['category']=='salary' and dt(t['timestamp']).year==at.year and dt(t['timestamp']).month==at.month)
    gap=at.day>=salary_day and month_salary<float(c['monthly_income'])*.7
    return [ratio(cash,emi),ratio(max(0,cash-pending),emi),ratio(pending,emi),
            ratio(float(c['monthly_income']),emi),ratio(float(c['monthly_expense']),float(c['monthly_income'])),
            ratio(credit,float(c['credit_limit'])),max(0,(due-at).total_seconds()/86400),
            max(0,(salary_date-due).total_seconds()/86400),sum(past)/max(1,len(past)),sum(past),int(gap),ratio(draws,emi)]

def load_data(folder='data/synthetic'):
    tables={}
    for name in ['customers','transactions','loans','repayments']:
        with (Path(folder)/f'{name}.csv').open(encoding='utf-8') as stream:
            tables[name]=list(csv.DictReader(stream))
    tables['by_customer']=defaultdict(list)
    tables['repayments_by_customer']=defaultdict(list)
    for t in tables['transactions']:tables['by_customer'][t['customer_id']].append(t)
    for r in tables['repayments']:tables['repayments_by_customer'][r['customer_id']].append(r)
    return tables

def build_rows(tables,cutoff,observed_through=None):
    observed_through=observed_through or dt('2026-11-05T23:59:59.999999+05:30')
    customers={c['customer_id']:c for c in tables['customers']}
    loans={l['loan_id']:l for l in tables['loans']}
    fraud=[];repayment=[]
    for cid,rows in tables['by_customer'].items():
        c=customers[cid]
        for t in rows:
            at=dt(t['timestamp'])
            if t['status']!='Completed' or at>cutoff or at.month!=9:continue
            fraud.append(dict(customer_id=cid,as_of=t['timestamp'],features=fraud_features(c,t,rows),target=int(t['is_fraud']),cohort=c['financial_trajectory']))
        for day in [3,11,19,29]:
            at=dt(f'2026-09-{day:02}T23:59:59+05:30')
            for loan in [l for l in tables['loans'] if l['customer_id']==cid]:
                future=[r for r in tables['repayments_by_customer'][cid] if r['loan_id']==loan['loan_id'] and at<dt(r['due_date']+'T12:00:00+05:30')<=at+timedelta(days=30)]
                if not future:continue
                r=min(future,key=lambda v:v['due_date']);due=dt(r['due_date']+'T12:00:00+05:30')
                maturity=label_cutoff(r['due_date'])
                target=repayment_target(r,rows,observed_through)
                if target is None:continue
                repayment.append(dict(customer_id=cid,loan_id=loan['loan_id'],as_of=at.isoformat(),label_cutoff=maturity.isoformat(),
                    features=repayment_features(c,loan,rows,tables['repayments_by_customer'][cid],at,due),
                    target=target,cohort=c['financial_trajectory']))
    return fraud,repayment
