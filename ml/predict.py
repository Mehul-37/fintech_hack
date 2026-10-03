"""Local prediction using a saved model and an ordered numeric feature vector."""
import argparse
import json
import os
from pathlib import Path
os.environ.setdefault('OMP_NUM_THREADS','4')
os.environ.setdefault('LOKY_MAX_CPU_COUNT','4')
import joblib
import numpy as np

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--model',choices=['fraud','repayment'],required=True)
    parser.add_argument('--features',required=True,help='JSON array in saved feature order')
    args=parser.parse_args()
    bundle=joblib.load(Path(__file__).parent/'artifacts'/f'{args.model}.joblib')
    values=np.array(json.loads(args.features),dtype=float).reshape(1,-1)
    if values.shape[1]!=len(bundle['features']) or not np.isfinite(values).all():
        parser.error('Expected finite values in order: '+', '.join(bundle['features']))
    raw=bundle['model'].decision_function(values).reshape(-1,1)
    probability=float(bundle['calibration'].predict_proba(raw)[0,1])
    print(json.dumps(dict(model=args.model,probability=probability,score=round(probability*100))))
