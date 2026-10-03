import numpy as np
from scipy.special import expit

class IdentityCalibration:
    """Preserve the learner's probabilities when validation does not support recalibration."""
    coef_=np.array([[1.]])
    intercept_=np.array([0.])
    def predict_proba(self,margins):
        p=expit(np.asarray(margins).reshape(-1))
        return np.column_stack([1-p,p])
