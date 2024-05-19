import json
import os
import matplotlib.pyplot as plt
import numpy as np
import matplotlib.patches as mpatches

def load_data_from_files(directory):
    all_data = {}
    aspect_data = {}
    metrics_data = {}
    dir_list = sorted([d for d in os.listdir(directory) if os.path.isdir(os.path.join(directory, d))])
    for dir_name in dir_list:
        dir_path = os.path.join(directory, dir_name)
        for filename in sorted(os.listdir(dir_path)):
            if filename.endswith(".json"):
                filepath = os.path.join(dir_path, filename)
                with open(filepath) as f:
                    data = json.load(f)
                    if 'config' in data:
                        config = data['config']
                        problem_size = config['scheduledEvents']
                        test_case_label = f"{config['beamParticle']}_{config['renderMode']}_{config.get('messageDensity', '')}_{config.get('trajectoryOptimization', '')}_{config.get('binNumber', '')}"
                        start_time = data['log']['startTime']
                        end_time = data['log']['endTime']
                        render_end_time = data['log']['renderEndTime']
                        simulation_duration = end_time - start_time
                        rendering_duration = render_end_time - start_time
                        if test_case_label not in all_data:
                            all_data[test_case_label] = []
                        all_data[test_case_label].append((simulation_duration, rendering_duration, problem_size))
                        
                        aspect_label = f"{test_case_label}_{problem_size}"
                        if aspect_label not in aspect_data:
                            aspect_data[aspect_label] = []

                        # Collect aspect data
                        for key in ['messages', 'optimizations', 'renders', 'handles']:
                            for entry in data['log'][key]:
                                aspect_data[aspect_label].append({
                                    'aspect': key,
                                    'timeStart': entry['timeStart'],
                                    'timeEnd': entry['timeEnd']
                                })

                        # Collect metrics data
                        if test_case_label not in metrics_data:
                            metrics_data[test_case_label] = []
                        metrics_data[test_case_label].append({
                            'problemSize': problem_size,
                            'framesPerSecond': data['log']['framesPerSecond'],
                            'messagesPerSecond': data['log']['messagesPerSecond'],
                            'eventsPerSecond': data['log']['eventsPerSecond'],
                            'tracksPerSecond': data['log']['tracksPerSecond']
                        })
    return all_data, aspect_data, metrics_data

def plot_durations(all_data):
    # Calculate the number of rows and columns for the subplots
    num_test_cases = len(all_data)
    cols = int(np.ceil(np.sqrt(num_test_cases/2)*2))
    rows = int(np.ceil(num_test_cases / cols))

    fig, axs = plt.subplots(rows, cols, figsize=(15, 7))
    axs = axs.flatten()  # Flatten the array of axes to make it easier to iterate over

    for i, (test_case_label, durations) in enumerate(sorted(all_data.items(), key=lambda item: item[0])):
        sim_durations, rend_durations, problem_sizes = zip(*durations)
        data = []
        for j, problem_size in enumerate(problem_sizes):
            label = f"{problem_size}"
            simulation_duration = sim_durations[j]
            rendering_duration = rend_durations[j]
            data.append((problem_size, label, simulation_duration, rendering_duration))
        # Sort data by problem size
        data.sort()
        problem_sizes, labels, simulation_durations, rendering_durations = zip(*data)
        x = np.arange(len(labels))  # the label locations
        width = 0.35  # the width of the bars
        axs[i].bar(x - width/2, simulation_durations, width, label='Simulation')
        axs[i].bar(x + width/2, rendering_durations, width, label='Rendering')

        # Add some text for labels, title and custom x-axis tick labels, etc.
        axs[i].set_xlabel('Problem Sizes')
        axs[i].set_ylabel('Duration (ms)')
        axs[i].set_title(test_case_label)
        axs[i].set_xticks(x)
        axs[i].set_xticklabels(labels, rotation=45)
        axs[i].legend()
        axs[i].grid(True, axis='y')  # Add horizontal grid only

    # Remove unused subplots
    for i in range(num_test_cases, rows*cols):
        fig.delaxes(axs[i])

    plt.tight_layout()
    plt.show()

def plot_percentage_difference(all_data):
    # Calculate the number of rows and columns for the subplots
    num_test_cases = len(all_data)
    cols = int(np.ceil(np.sqrt(num_test_cases/2)*2))
    rows = int(np.ceil(num_test_cases / cols))

    fig, axs = plt.subplots(rows, cols, figsize=(15, 7))
    axs = axs.flatten()  # Flatten the array of axes to make it easier to iterate over

    for i, (test_case_label, durations) in enumerate(sorted(all_data.items(), key=lambda item: item[0])):
        sim_durations, rend_durations, problem_sizes = zip(*durations)
        data = []
        for j, problem_size in enumerate(problem_sizes):
            label = f"{problem_size}"
            percentage_difference = ((rend_durations[j] - sim_durations[j]) / sim_durations[j]) * 100
            data.append((problem_size, label, percentage_difference))
        # Sort data by problem size
        data.sort()
        problem_sizes, labels, percentage_differences = zip(*data)
        x = np.arange(len(labels))  # the label locations
        width = 0.35  # the width of the bars
        axs[i].bar(x, percentage_differences, width, label='Percentage Difference')

        # Add some text for labels, title and custom x-axis tick labels, etc.
        axs[i].set_xlabel('Problem Sizes')
        axs[i].set_ylabel('Percentage Difference (%)')
        axs[i].set_title(test_case_label)
        axs[i].set_xticks(x)
        axs[i].set_xticklabels(labels, rotation=45)
        axs[i].legend()
        axs[i].grid(True, axis='y')  # Add horizontal grid only

    # Remove unused subplots
    for i in range(num_test_cases, rows*cols):
        fig.delaxes(axs[i])

    plt.tight_layout()
    plt.show()

def plot_aspects(aspect_data, test_case_label):
    colors = {
        'messages': 'blue',
        'optimizations': 'green',
        'renders': 'red',
        'handles': 'purple'
    }

    plt.figure(figsize=(15, 7))

    if test_case_label in aspect_data:
        aspects = aspect_data[test_case_label]
        # Sort aspects by 'timeStart'
        # aspects.sort(key=lambda x: x['timeStart'])
        plt.title(test_case_label)
        base_y = 0
        for aspect in aspects:
            if(aspect['timeStart'] == aspect['timeEnd']):
                continue
            plt.plot([aspect['timeStart'], aspect['timeEnd']], [base_y, base_y], color=colors[aspect['aspect']], linewidth=10)
            base_y += .5  # Increase the increment to spread aspects more on the y-axis

        patches = [mpatches.Patch(color=color, label=key) for key, color in colors.items()]
        plt.legend(handles=patches)
        plt.xlabel('Time (ms)')
        plt.grid(True, axis='x')

    plt.tight_layout()
    plt.show()
    
def plot_metrics_over_time(metrics_data):
    metrics = ['framesPerSecond', 'messagesPerSecond', 'eventsPerSecond', 'tracksPerSecond']
    metric_labels = ['Frames/s', 'Messages/s', 'Events/s', 'Tracks/s']
    num_metrics = len(metrics)
    cols = int(np.ceil(np.sqrt(num_metrics)))
    rows = int(np.ceil(num_metrics / cols))

    # Group data by problem size
    problem_sizes = {}
    for test_case_label, runs in metrics_data.items():
        for run in runs:
            problem_size = run['problemSize']
            if problem_size not in problem_sizes:
                problem_sizes[problem_size] = []
            problem_sizes[problem_size].append((test_case_label, run))
    
    # Iterate over problem sizes
    for problem_size, test_cases in sorted(problem_sizes.items(), key=lambda item: item[0]):
        fig, axs = plt.subplots(rows, cols, figsize=(15, 7), squeeze=False)
        axs = axs.flatten()

        for i, metric in enumerate(metrics):
            for test_case_label, run in test_cases:
                if metric in run:
                    times = [entry['time'] for entry in run[metric]]
                    values = [entry['newValues'] for entry in run[metric]]

                    # Normalize times to start at 0 and convert to seconds
                    times = [(t - times[0]) / 1000 for t in times]

                    axs[i].plot(times, values, label=f'{test_case_label}')

            axs[i].set_xlabel('Time (s)')
            axs[i].set_ylabel(metric_labels[i])
            axs[i].set_title(f'{metric} Over Time for {problem_size} Events')
            axs[i].legend()
            axs[i].grid(True)

        # Remove unused subplots
        for i in range(num_metrics, rows*cols):
            fig.delaxes(axs[i])

        plt.tight_layout()
        plt.show()

# Directory containing JSON files
directory = 'logs'

# Load data from all files
all_data, aspect_data, metrics_data = load_data_from_files(directory)

# plot_durations(all_data)
# plot_percentage_difference(all_data)
plot_metrics_over_time(metrics_data)
# plot_aspects(aspect_data, "electron_all_oneEvent_optimizationDisabled_2_256")
# plot_aspects(aspect_data, "electron_all_oneEvent_optimizationEnabled_2_256")
# plot_aspects(aspect_data, "electron_all_oneEvent_optimizationDisabled_200_256")
# plot_aspects(aspect_data, "electron_all_oneEvent_optimizationEnabled_200_256")