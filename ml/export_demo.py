"""Export fuller presentation histories from an independent seeded simulation.

Selection uses source order, one-loan compatibility and due date; never model scores/labels.
"""
import json
import sys
import random
from collections import defaultdict
from datetime import timedelta
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'generator'))
from generate import generate
from validate import validate
from features import load_data,dt,label_cutoff

NAMES=['Aditi Nair','Kabir Sethi','Ishita Das','Vikram Singh','Ananya Bose','Rahul Jain',
       'Meera Iyer','Kunal Verma','Sana Ali','Nikhil Joshi','Tara Menon','Aman Gupta',
       'Riya Malhotra','Sahil Batra','Pooja Pillai','Dhruv Bansal','Simran Kaur','Yash Patel','Sneha Roy']

def export_source(folder, seed, count, names, customer_prefix='SYN'):
    manifest=generate(customers=count,seed=seed,output=folder,customer_prefix=customer_prefix);validate(folder)
    data=load_data(folder);loans=defaultdict(list)
    for loan in data['loans']:loans[loan['customer_id']].append(loan)
    eligible=[c for c in data['customers'] if len(loans[c['customer_id']])==1 and int(loans[c['customer_id']][0]['due_day_of_month'])>=25]
    assert len(eligible)>=len(names), 'Not enough compatible presentation histories'
    output=[];probes=[]
    from features import FRAUD_FEATURES,REPAYMENT_FEATURES,fraud_features,repayment_features
    for name,c in zip(names,eligible[:len(names)]):
        cid=c['customer_id'];loan=loans[cid][0];rows=data['by_customer'][cid]
        due=f'2026-09-{int(loan["due_day_of_month"]):02}T12:00:00+05:30'
        current=next(r for r in data['repayments_by_customer'][cid] if r['loan_id']==loan['loan_id'] and r['due_date']==due[:10])
        def source_id(value):
            return value if customer_prefix == 'SYN' else f'{customer_prefix}-{value}'
        transactions=[];events=[dict(id=f'{cid}-BASE',at='2026-09-01T08:00:00+05:30',kind='baseline',
            title='Observed August ledger baseline',detail='Independent seeded simulation; configured profile and observed August transactions are available.')]
        for t in rows:
            if dt(t['timestamp'])>dt(manifest['history_cutoff']) and t['status']!='Pending':continue
            if t['status']=='Pending' and dt(t['known_at'])>dt(manifest['history_cutoff']):continue
            signals=[]
            if t['is_new_beneficiary']=='1':signals.append('First-seen beneficiary')
            if t['is_new_device']=='1':signals.append('Unfamiliar device')
            if float(t['amount'])>=float(c['usual_transfer_amount'])*5 and t['category']=='transfer':signals.append('Large relative to configured usual transfer')
            mapped=dict(id=source_id(t['transaction_id']),at=t['timestamp'],amount=float(t['amount']),direction=t['direction'],
                category=t['category'],status=t['status'],channel=t['channel'],counterparty=t['account'],account=f'{cid}-{t["account"]}',
                signals=signals,risk=0,newBeneficiary=t['is_new_beneficiary']=='1',unusualDevice=t['is_new_device']=='1')
            if t['known_at']:mapped['knownAt']=t['known_at']
            if t['loan_id']:mapped.update(loanId=source_id(t['loan_id']),installmentNum=int(t['installment_num']))
            transactions.append(mapped)
            if t['timestamp'].startswith('2026-09') and t['status']=='Completed':
                kind='transfer' if t['category']=='transfer' else 'liquidity' if t['category'] in ['essential','credit'] else 'baseline'
                events.append(dict(id=f'EV-{mapped["id"]}',at=t['timestamp'],kind=kind,
                    title='Payment movement observed' if kind=='transfer' else 'Cash-flow update' if kind=='liquidity' else 'Income received',
                    detail=f'{t["direction"]}: INR {t["amount"]} via {t["channel"]}; {t["category"]}. Observed ledger entry; purpose remains unverified.',
                    transactionIds=[mapped['id']]))
            if t['status']=='Completed':
                probes.append(dict(customerId=f'DEMO-{cid}',transactionId=mapped['id'],features=fraud_features(c,t,rows)))
        salary_day=int(c['salary_day_of_month'])
        observation=dt(f'2026-09-{salary_day:02}T18:00:00+05:30')
        received=sum(float(t['amount']) for t in rows if t['category']=='salary' and t['status']=='Completed' and t['timestamp'].startswith('2026-09') and dt(t['timestamp'])<=observation)
        if received<float(c['monthly_income'])*.7:
            events.append(dict(id=f'{cid}-INCOME',at=observation.isoformat(),kind='income',
                title='Salary below configured expectation',detail=f'Observed September salary INR {received:.2f}; configured monthly expectation INR {c["monthly_income"]}. Verify payroll timing.'))
        history=[]
        for r in data['repayments_by_customer'][cid]:
            if r['due_date']>=due[:10]:continue
            cutoff=label_cutoff(r['due_date']);payments=sorted([t for t in rows if t['loan_id']==r['loan_id'] and t['installment_num']==r['installment_num'] and t['status']=='Completed' and dt(t['timestamp'])<=cutoff],key=lambda t:t['timestamp'])
            paid=0;complete=None
            for t in payments:
                paid+=int(t['amount_paise'])
                if paid>=int(r['amount_due_paise']):complete=t;break
            late=(dt(complete['timestamp']).date()-dt(r['due_date']+'T00:00:00+05:30').date()).days if complete else 7
            history.append(dict(month=dt(r['due_date']+'T00:00:00+05:30').strftime('%b %Y'),
                status=('Paid' if late==0 else 'Late') if complete else 'Missed',daysLate=late,
                observedAt=complete['timestamp'] if complete else cutoff.isoformat()))
        # October schedule is a known expectation, not a future received-salary record.
        presentation=dict(id=f'DEMO-{cid}',name=name,occupation=c['occupation'],city=c['city'],
            salary=float(c['monthly_income']),expenses=float(c['monthly_expense']),openingCash=float(c['opening_cash']),
            openingCredit=float(c['opening_credit']),creditLimit=float(c['credit_limit']),usualTransfer=float(c['usual_transfer_amount']),
            loan=dict(id=source_id(loan['loan_id']),installmentNum=int(current['installment_num']),principal=float(loan['principal']),
                emi=float(loan['monthly_emi']),dueAt=due,salaryAt=f'2026-10-{salary_day:02}T09:00:00+05:30',history=history),
            transactions=transactions,events=sorted(events,key=lambda e:e['at']),scorePoints=[],dataSource='generated-holdout',sourceSeed=seed)
        output.append(presentation)
        for day in [1,12,24]:
            at=dt(f'2026-09-{day:02}T23:59:00+05:30')
            probes.append(dict(customerId=presentation['id'],asOf=at.isoformat(),features=repayment_features(c,loan,rows,data['repayments_by_customer'][cid],at,dt(due))))
    metadata=dict(seed=seed,folder=folder,selected_customer_ids=[c['id'] for c in output],selection=f'First {len(names)} source-order customers with exactly one loan and a September due date 25-28; no score or outcome filtering',source_hashes=manifest['hashes'])
    return output, probes, metadata

def main():
    output,probes,original=export_source('data/presentation',20261004,128,NAMES)
    first=['Anil','Akash','Arnav','Bharat','Deepak','Gaurav','Harsh','Ishan','Jatin','Manish',
        'Naveen','Parth','Rakesh','Sameer','Varun','Chitra','Divya','Esha','Farah','Geeta',
        'Juhi','Kavya','Leena','Mansi','Nisha','Pallavi','Reema','Shreya','Tanvi','Vidya']
    last=['Agarwal','Bhat','Chaudhary','Desai','Ghosh','Gupta','Iyer','Jain','Kapoor','Khan',
        'Kulkarni','Mehta','Menon','Mishra','Nair','Patel','Rao','Saxena','Sharma','Singh','Verma']
    names=random.Random(20261006).sample([f'{f} {l}' for f in first for l in last],88)
    extra,extra_probes,extension=export_source('data/presentation-extension',20261006,768,names,'EXT')
    output+=extra;probes+=extra_probes
    assert len(output)==107 and len({c['id'] for c in output})==107
    Path('src/generated-customers.json').write_text(json.dumps(output,separators=(',',':')),encoding='utf-8')
    Path('ml/artifacts/demo-feature-probes.json').write_text(json.dumps(probes,separators=(',',':')),encoding='utf-8')
    metadata=dict(total_portfolio_customers=112,authored_customers=5,generated_customers=107,
        preserved_customer_ids=original['selected_customer_ids'],sources=[original,extension])
    Path('ml/artifacts/demo-manifest.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
    print('Exported independent presentation histories:',len(output))

if __name__=='__main__':main()
