import csv
import json
import hashlib
from collections import defaultdict
from pathlib import Path
from datetime import datetime

def validate(folder='data/synthetic'):
    root=Path(folder)
    manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
    for name,expected in manifest['hashes'].items():
        assert hashlib.sha256((root/name).read_bytes()).hexdigest()==expected,f'hash mismatch {name}'
    tables={}
    for p in root.glob('*.csv'):
        with p.open(encoding='utf-8') as stream:tables[p.stem]=list(csv.DictReader(stream))
    for table,rows in tables.items():
        key={'customers':'customer_id','transactions':'transaction_id','loans':'loan_id','repayments':'repayment_id',
             'devices':'device_id','merchants':'merchant_id','customer_events':'event_id','behavioral_profiles':'profile_id'}[table]
        assert len({r[key] for r in rows})==len(rows),f'duplicate {table}'
    customers={r['customer_id']:r for r in tables['customers']}
    loans={r['loan_id']:r for r in tables['loans']}
    devices={r['device_id'] for r in tables['devices']}
    merchants={r['merchant_id'] for r in tables['merchants']}
    txs={r['transaction_id']:r for r in tables['transactions']}
    balances={k:int(v['opening_cash_paise']) for k,v in customers.items()}
    ordering=[(t['customer_id'],t['timestamp'],t['transaction_id']) for t in tables['transactions']]
    assert ordering==sorted(ordering),'transactions must be chronologically sorted by customer'
    for profile in tables['behavioral_profiles']:
        assert profile['customer_id'] in customers and profile['primary_device_id'] in devices
    for loan in loans.values():assert loan['customer_id'] in customers
    for t in tables['transactions']:
        assert t['customer_id'] in customers
        assert t['device_id'] in devices and (not t['merchant_id'] or t['merchant_id'] in merchants)
        assert (int(t['is_fraud'])==0)==(int(t['scam_type'])==0)
        assert int(t['amount_paise'])>0 and abs(float(t['amount'])*100-int(t['amount_paise']))<.01
        assert datetime.fromisoformat(t['timestamp']).utcoffset().total_seconds()==19800
        if t['status']=='Completed':
            balances[t['customer_id']]+=int(t['amount_paise'])*(1 if t['direction']=='in' else -1)
            assert balances[t['customer_id']]>=0, f'negative cash {t["transaction_id"]}'
        elif t['known_at']: assert t['known_at']<=t['timestamp']
    for r in tables['repayments']:
        assert r['loan_id'] in loans and loans[r['loan_id']]['customer_id']==r['customer_id']
        payments=[txs[t] for t in r['payment_transaction_ids'].split(';') if t]
        assert sum(int(t['amount_paise']) for t in payments)==int(r['amount_paid_paise'])
        assert int(r['amount_paid_paise'])<=int(r['amount_due_paise'])
        for t in payments:
            assert t['loan_id']==r['loan_id'] and t['customer_id']==r['customer_id'] and t['category']=='emi'
            assert t['installment_num']==r['installment_num'] and t['status']=='Completed' and t['direction']=='out'
            assert t['timestamp'][:10]>=r['due_date']
    for row in tables['customer_events']:
        assert row['customer_id'] in customers
        for tid in row['transaction_ids'].split(';'):
            assert txs[tid]['customer_id']==row['customer_id'] and txs[tid]['timestamp']<=row['timestamp']
    report={'passed':True,'customers':len(customers),'transactions':len(txs),'repayments':len(tables['repayments']),
            'checks':['unique primary keys','foreign keys','integer-paise reconciliation','no negative cash',
                      'repayment transaction reconciliation','no payments before due','event timing','IST timestamps',
                      'chronological ledger order','profile/device references','installment-specific payment matching',
                      'source hashes match manifest']}
    (root/'validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report));return report

if __name__=='__main__': validate()
