import os
os.environ.setdefault('OMP_NUM_THREADS','4')
import json
import joblib
import numpy as np

for name in ['fraud','repayment']:
    rows=[json.loads(line) for line in open(f'ml/artifacts/{name}-training-rows.jsonl',encoding='utf-8')]
    rows=[r for r in rows if r['split']=='validation']
    bundle=joblib.load(f'ml/artifacts/{name}.joblib')
    x=np.array([r['features'] for r in rows]);y=np.array([r['target'] for r in rows])
    raw=bundle['model'].predict_proba(x)[:,1]
    p=bundle['calibration'].predict_proba(bundle['model'].decision_function(x).reshape(-1,1))[:,1]
    print(name,json.dumps(dict(quantiles=np.quantile(p,[0,.1,.5,.75,.9,.95,.99,1]).tolist(),
        under_1_percent=float(np.mean(p<.01)),over_99_percent=float(np.mean(p>.99)),
        between_10_and_90_percent=float(np.mean((p>=.1)&(p<=.9))),
        raw_under_1_percent=float(np.mean(raw<.01)),raw_over_99_percent=float(np.mean(raw>.99)))))
    if name=='fraud':
        for j in [0,1,2,4,5,6]:
            print(bundle['features'][j],[(int(k),np.quantile(x[y==k,j],[.1,.5,.9]).tolist()) for k in [0,1]])
