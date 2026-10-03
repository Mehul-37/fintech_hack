import copy
import unittest
from features import load_data,dt,label_cutoff,repayment_target,repayment_features,fraud_features

class FeatureBoundaries(unittest.TestCase):
    def test_partial_payments_cutoff_and_maturity(self):
        installment=dict(loan_id='L1',installment_num='1',due_date='2026-09-20',amount_due_paise='10000')
        def payment(amount,at,loan='L1',number='1'):
            return dict(loan_id=loan,installment_num=number,amount_paise=str(amount),timestamp=at,status='Completed')
        rows=[payment(4000,'2026-09-20T12:00:00+05:30'),payment(6000,'2026-09-27T23:59:59.999999+05:30')]
        cutoff=label_cutoff(installment['due_date'])
        self.assertEqual(repayment_target(installment,rows,cutoff),0)
        self.assertEqual(repayment_target(installment,[rows[0],payment(6000,'2026-09-28T00:00:00+05:30')],dt('2026-09-30T00:00:00+05:30')),1)
        self.assertIsNone(repayment_target(installment,rows,dt('2026-09-27T23:59:00+05:30')))
        self.assertEqual(repayment_target(installment,[payment(10000,'2026-09-20T12:00:00+05:30',loan='L2')],cutoff),1)
        self.assertEqual(repayment_target(installment,[payment(10000,'2026-09-20T12:00:00+05:30',number='2')],cutoff),1)

    def test_future_and_final_outcomes_do_not_change_features(self):
        data=load_data();loan=data['loans'][0];c=next(c for c in data['customers'] if c['customer_id']==loan['customer_id'])
        rows=data['by_customer'][c['customer_id']];repayments=data['repayments_by_customer'][c['customer_id']]
        at=dt('2026-09-11T23:59:59+05:30');due=dt('2026-09-25T12:00:00+05:30')
        changed=copy.deepcopy(rows);truth=copy.deepcopy(repayments)
        for t in changed:
            t['is_fraud']='1';t['scam_type']='4'
            if dt(t['timestamp'])>at and t['status']=='Completed':t['amount']='999999';t['amount_paise']='99999900'
        for r in truth:r['amount_paid_paise']='99999900';r['repayment_status']='on_time'
        self.assertEqual(repayment_features(c,loan,rows,repayments,at,due),repayment_features(c,loan,changed,truth,at,due))
        t=next(t for t in rows if t['category']=='transfer' and dt(t['timestamp'])<at)
        changed_t={**t,'is_fraud':'1','scam_type':'4'}
        self.assertEqual(fraud_features(c,t,rows),fraud_features(c,changed_t,changed))

if __name__=='__main__':unittest.main()
