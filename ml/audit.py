"""Independent frozen-model audit. Does not train, select thresholds or overwrite models."""
import os
os.environ.setdefault('OMP_NUM_THREADS','4')
import sys
import json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'generator'))
import joblib
import numpy as np
from generate import generate
from validate import validate
from features import load_data,build_rows,dt
from train import metrics

if __name__=='__main__':
    folder='data/independent-audit';seed=20261005
    manifest=generate(customers=2000,seed=seed,customer_prefix='AUD',output=folder)
    validate(folder)
    rows=build_rows(load_data(folder),dt(manifest['history_cutoff']),dt(manifest['followup_cutoff']))
    source=json.loads(Path('ml/artifacts/evaluation.json').read_text())
    report=dict(seed=seed,customers=2000,provider_version=source['provider_version'],
        scope='New independent simulation after generator/model freeze; no model fitting or selection on these results',
        dataset_hashes=manifest['hashes'],models={})
    for name,data in zip(['fraud','repayment'],rows):
        bundle=joblib.load(f'ml/artifacts/{name}.joblib');x=np.array([r['features'] for r in data]);y=np.array([r['target'] for r in data])
        p=bundle['calibration'].predict_proba(bundle['model'].decision_function(x).reshape(-1,1))[:,1]
        threshold=source['models'][name]['validation']['threshold']
        report['models'][name]=metrics(y,p,threshold)
        print(name,json.dumps(report['models'][name]))
    Path('ml/artifacts/independent-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
