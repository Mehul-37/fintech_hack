import json
import os
import platform
import time
from datetime import timedelta
from pathlib import Path

os.environ.setdefault('OMP_NUM_THREADS','4')
import joblib
import numpy as np
import sklearn
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import average_precision_score,brier_score_loss,precision_score,recall_score,roc_auc_score,log_loss
from sklearn.model_selection import GroupKFold
from calibration import IdentityCalibration
from features import FRAUD_FEATURES,REPAYMENT_FEATURES,build_rows,load_data,dt

def metrics(y,p,threshold):
    pred=p>=threshold
    return dict(rows=len(y),positives=int(sum(y)),pr_auc=float(average_precision_score(y,p)),
        roc_auc=float(roc_auc_score(y,p)),brier=float(brier_score_loss(y,p)),log_loss=float(log_loss(y,p)),
        precision=float(precision_score(y,pred,zero_division=0)),recall=float(recall_score(y,pred,zero_division=0)),
        false_alerts_per_1000=float(sum(pred & (y==0))/len(y)*1000),threshold=float(threshold))

def export_model(model,calibration,features):
    return dict(features=features,baseline=float(model._baseline_prediction[0,0]),
        calibration=[float(calibration.coef_[0,0]),float(calibration.intercept_[0])],
        trees=[[dict(value=float(n['value']),feature=int(n['feature_idx']),threshold=float(n['num_threshold']),
                    left=int(n['left']),right=int(n['right']),leaf=bool(n['is_leaf']),missing_left=bool(n['missing_go_to_left']))
                for n in stage[0].nodes] for stage in model._predictors])

def main():
    start=time.monotonic();root=Path('ml/artifacts');root.mkdir(parents=True,exist_ok=True)
    tables=load_data();manifest=json.loads(Path('data/synthetic/manifest.json').read_text())
    rows=build_rows(tables,dt(manifest['history_cutoff']),dt(manifest['followup_cutoff']))
    ids=np.array([c['customer_id'] for c in tables['customers']]);np.random.default_rng(42).shuffle(ids)
    splits={cid:'train' if i<1400 else 'validation' if i<1700 else 'test' for i,cid in enumerate(ids)}
    report=dict(source='synthetic',seed=42,python=platform.python_version(),sklearn=sklearn.__version__,
        provider_version='histgb-synthetic-v2.1',dataset_hashes=manifest['hashes'],
        history_cutoff=manifest['history_cutoff'],followup_cutoff=manifest['followup_cutoff'],
        split_customers=dict(train=1400,validation=300,test=300),
        evaluation='customer-disjoint synthetic holdout; temporal generalization unverified',
        repayment_target='Next EMI due within 30 days retains a positive balance at end of seventh calendar day after due date (IST)',models={})
    bundles={};browser=dict(version='histgb-synthetic-v2.1',training_customers=2000,models={},thresholds={})
    for name,data,features in zip(['fraud','repayment'],rows,[FRAUD_FEATURES,REPAYMENT_FEATURES]):
        sets={s:[r for r in data if splits[r['customer_id']]==s] for s in ['train','validation','test']}
        def xy(s):return np.array([r['features'] for r in sets[s]],dtype=float),np.array([r['target'] for r in sets[s]])
        x,y=xy('train');vx,vy=xy('validation');tx,ty=xy('test')
        baseline=make_pipeline(StandardScaler(),LogisticRegression(max_iter=1000,random_state=42))
        baseline.fit(x,y)
        best=None
        for leaves in [7,15]:
            model=HistGradientBoostingClassifier(max_iter=100,max_leaf_nodes=leaves,min_samples_leaf=25,
                learning_rate=.08,l2_regularization=2,early_stopping=False,random_state=42)
            model.fit(x,y)
            value=log_loss(vy,model.predict_proba(vx)[:,1])
            if best is None or value<best[0]:best=(value,model)
        model=best[1]
        margins=model.decision_function(vx).reshape(-1,1)
        crossfit=np.zeros(len(vy))
        groups=np.array([r['customer_id'] for r in sets['validation']])
        for fit,check in GroupKFold(n_splits=3).split(vx,vy,groups):
            candidate=LogisticRegression(C=1,max_iter=1000).fit(margins[fit],vy[fit])
            crossfit[check]=candidate.predict_proba(margins[check])[:,1]
        raw_validation=model.predict_proba(vx)[:,1]
        use_platt=log_loss(vy,crossfit)<log_loss(vy,raw_validation)
        cal=LogisticRegression(C=1,max_iter=1000).fit(margins,vy) if use_platt else IdentityCalibration()
        vp=cal.predict_proba(model.decision_function(vx).reshape(-1,1))[:,1]
        # Threshold selection uses validation only; cost balances both kinds of errors.
        threshold=round(float(min(np.arange(.05,.91,.025),key=lambda t:float(np.sum((vp>=t)&(vy==0))+2*np.sum((vp<t)&(vy==1))))),3)
        testp=cal.predict_proba(model.decision_function(tx).reshape(-1,1))[:,1]
        rawp=model.predict_proba(tx)[:,1]
        exported=export_model(model,cal,features)
        browser['models'][name]=exported
        browser['thresholds'][name]=threshold*100
        bundles[name]=dict(model=model,calibration=cal,features=features,version=browser['version'])
        joblib.dump(bundles[name],root/f'{name}.joblib')
        cohort_metrics={}
        for cohort in sorted({r['cohort'] for r in sets['test']}):
            mask=np.array([r['cohort']==cohort for r in sets['test']]);cy=ty[mask];cp=testp[mask]
            cohort_metrics[cohort]=dict(rows=int(sum(mask)),positives=int(sum(cy)),alerts=int(sum(cp>=threshold)),
                false_alerts=int(sum((cp>=threshold)&(cy==0))),missed=int(sum((cp<threshold)&(cy==1))))
        report['models'][name]=dict(algorithm='HistGradientBoostingClassifier',features=features,
            calibration_selection=dict(method='platt' if use_platt else 'identity',
                raw_validation_log_loss=float(log_loss(vy,raw_validation)),
                customer_crossfit_platt_log_loss=float(log_loss(vy,crossfit))),
            fitted_parameters=model.get_params(),
            split_rows={s:len(v) for s,v in sets.items()},split_positives={s:sum(r['target'] for r in v) for s,v in sets.items()},
            validation=metrics(vy,vp,threshold),test=metrics(ty,testp,threshold),
            uncalibrated_test_brier=float(brier_score_loss(ty,rawp)),
            logistic_baseline_test=metrics(ty,baseline.predict_proba(tx)[:,1],.5),exception_cohorts=cohort_metrics)
        report['models'][name]['test_score_distribution']=dict(
            percentiles={str(q):float(np.quantile(testp,q/100)*100) for q in [0,10,25,50,75,90,95,99,100]},
            below_one_percent=float(np.mean(testp<.01)),above_99_percent=float(np.mean(testp>.99)),
            between_10_and_90_percent=float(np.mean((testp>=.1)&(testp<=.9))))
        if name=='repayment':
            episodes={}
            for row,probability in zip(sets['test'],testp):
                if not row['target']:continue
                key=(row['customer_id'],row['loan_id'],row['label_cutoff'])
                episode=episodes.setdefault(key,[])
                if probability>=threshold:
                    due=dt(row['label_cutoff'])-timedelta(days=7)
                    episode.append((due.date()-dt(row['as_of']).date()).days)
            leads=[max(v) for v in episodes.values() if v]
            report['models'][name]['warning_lead_time']=dict(
                overdue_installments_with_snapshots=len(episodes),warned_installments=len(leads),
                median_days_before_due=float(np.median(leads)) if leads else None,
                scope='Four September snapshots; synthetic held-out customers; no continuous-monitoring claim')
        # Numeric probe vectors enable browser/Python parity testing without dataset dumps.
        probes=[dict(features=tx[i].tolist(),raw=float(model.decision_function(tx[i:i+1])[0]),
                     probability=float(testp[i])) for i in range(min(30,len(tx)))]
        (root/f'{name}-probes.json').write_text(json.dumps(probes),encoding='utf-8')
        print(name,json.dumps(report['models'][name]['test']))
    report['elapsed_seconds']=round(time.monotonic()-start,2)
    (root/'evaluation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    (root/'splits.json').write_text(json.dumps(splits,indent=2),encoding='utf-8')
    (root/'models.json').write_text(json.dumps(browser,separators=(',',':')),encoding='utf-8')
    Path('src/ml-models.json').write_text(json.dumps(browser,separators=(',',':')),encoding='utf-8')
    for name,data,features in zip(['fraud','repayment'],rows,[FRAUD_FEATURES,REPAYMENT_FEATURES]):
        with (root/f'{name}-training-rows.jsonl').open('w',encoding='utf-8') as f:
            for row in data:f.write(json.dumps({**row,'split':splits[row['customer_id']]})+'\n')
    print('Training seconds:',report['elapsed_seconds'])

if __name__=='__main__':main()
