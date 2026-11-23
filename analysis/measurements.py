import sys
from statistics import mean, median, stdev

concentrations = [2.4, 3.1, 1.8]

print(f"Mean concentration: {mean(concentrations):.2f} mg/ml")
print(f"Interpreter: {sys.executable}")