import tempfile
import unittest
from generate import generate
from validate import validate

class GeneratorChecks(unittest.TestCase):
    def test_seed_reproducibility_and_full_run_validation(self):
        with tempfile.TemporaryDirectory() as first,tempfile.TemporaryDirectory() as second:
            a=generate(customers=60,output=first);b=generate(customers=60,output=second)
            self.assertEqual(a['hashes'],b['hashes'])
            self.assertTrue(validate(first)['passed'])

if __name__=='__main__':unittest.main()
