import json
import os
import sys
import matplotlib.pyplot as plt
import numpy as np
import matplotlib.patches as mpatches
import matplotlib.colors as mcolors
import pandas as pd

# Get the directory of the current file
current_dir = os.path.dirname(__file__)

# Construct the path to the directory where publish.py is located
publish_dir = os.path.join(current_dir, "pyblish")

# Append the directory to sys.path
sys.path.append(publish_dir)

# Now you can import the publish module
import publish
from format import TimeStampEntity, StepLogEntity, MessageLogEntity, Result

# end if the path is not provided
if len(sys.argv) < 2:
    print("Please provide the path to the directory containing the JSON files")
    sys.exit(1)

json_dir = sys.argv[1]
print(f"Reading JSON files from {json_dir}")

# test linear function plot
def plot_linear_function():
    x = np.linspace(0, 10, 100)
    y = 2 * x + 1
    plt.plot(x, y)
    plt.xlabel("x")
    plt.ylabel("y")
    plt.title("Linear function y = 2x + 1")
    plt.grid()
    plt.legend(["y = 2x + 1"])
    plt.show()
    
plot_linear_function()