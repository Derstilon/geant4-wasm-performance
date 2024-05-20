import json
import os
import matplotlib.pyplot as plt
import numpy as np
import matplotlib.patches as mpatches
import pandas as pd

def load_data_from_files(directory):
    all_data = {}
    aspect_data = {}
    metrics_data = {}
    stacked_bar_data = []
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
                        log = data['log']
                        if 'scheduledEvents' not in config:
                            continue
                        problem_size = config['scheduledEvents']
                        test_case_label = f"{config.get('binSizeCategory', '')}_{config['beamParticle']}_{config['renderMode']}_{config.get('trajectoryOptimization', '')}"
                        start_time = log['startTime']
                        end_time = log['endTime']
                        render_end_time = log['renderEndTime']
                        simulation_duration = end_time - start_time
                        rendering_duration = render_end_time - start_time
                        if test_case_label not in all_data:
                            all_data[test_case_label] = {}
                        if problem_size not in all_data[test_case_label]:
                            all_data[test_case_label][problem_size] = []
                        all_data[test_case_label][problem_size].append((simulation_duration, rendering_duration))
                        
                        aspect_label = f"{test_case_label}_{problem_size}"
                        if aspect_label not in aspect_data:
                            aspect_data[aspect_label] = []
                        else:
                            continue
                            

                        # Collect aspect data
                        for key in ['messages', 'optimizations', 'renders', 'handles']:
                            for entry in log[key]:
                                aspect_data[aspect_label].append({
                                    'aspect': key,
                                    'timeStart': entry['timeStart'],
                                    'timeEnd': entry['timeEnd']
                                })

                        # Collect metrics data
                        if test_case_label not in metrics_data:
                            metrics_data[test_case_label] = []
                        else:
                            # Check if data with the same configuration and problem size already exists
                            if any(data['problemSize'] == problem_size for data in metrics_data[test_case_label]):
                                continue
                        metrics_data[test_case_label].append({
                            'problemSize': problem_size,
                            'framesPerSecond': log['framesPerSecond'],
                            'messagesPerSecond': log['messagesPerSecond'],
                            'eventsPerSecond': log['eventsPerSecond'],
                            'tracksPerSecond': log['tracksPerSecond']
                        })
                        
                        total_optimization_time = sum(entry['timeEnd'] - entry['timeStart'] for entry in log['optimizations'])
                        total_render_time = sum(entry['timeEnd'] - entry['timeStart'] for entry in log['renders'])
                        total_handle_time = sum(entry['timeEnd'] - entry['timeStart'] for entry in log['handles'])

                        # Collect data for stacked bar chart if data with the same configuration and problem size does not exist
                        if not any(data['Config'] == test_case_label and data['problemSize'] == problem_size for data in stacked_bar_data):
                            stacked_bar_data.append({
                                'Config': test_case_label,
                                'Optimization Time': total_optimization_time,
                                'Render Time': total_render_time,
                                'Handle Time': total_handle_time,
                                'Total Time': total_optimization_time + total_render_time + total_handle_time,
                                'problemSize': problem_size,
                            })
    return all_data, aspect_data, metrics_data, stacked_bar_data

def plot_durations(all_data, label_keyword):
    # Filter data on the rule that the label_keyword must be regex substring of the test_case_label
    all_data = {k: v for k, v in all_data.items() if label_keyword in k}
    
    # Calculate the number of rows and columns for the subplots
    num_test_cases = len(all_data)
    cols = int(np.ceil(np.sqrt(num_test_cases)/2)*2)
    if(cols == 0):
        return
    rows = int(np.ceil(num_test_cases / cols))

    fig, axs = plt.subplots(rows, cols, figsize=(15, 7))
    axs = axs.flatten()  # Flatten the array of axes to make it easier to iterate over

    for i, (test_case_label, test_runs) in enumerate(sorted(all_data.items(), key=lambda item: item[0])):
        
        data = []
        for j, (problem_size, durations) in enumerate(sorted(test_runs.items(), key=lambda item: int(item[0]))):
            sim_durations, rend_durations = zip(*durations)
            label = f"{problem_size}"
            
            # rescale times to seconds
            sim_durations = [d / 1000.0 for d in sim_durations]
            rend_durations = [d / 1000.0 for d in rend_durations]
            avg_simulation = np.average(sim_durations)
            avg_rendering = np.average(rend_durations)
            std_simulation = np.std(sim_durations)
            std_rendering = np.std(rend_durations)
            data.append((label, avg_simulation, avg_rendering, std_simulation, std_rendering))
        # Sort data by problem size
        labels, avg_simulations, avg_renderings, std_simulations, std_renderings = zip(*data)
        x = np.arange(len(labels))  # the label locations
        width = 0.35  # the width of the bars\
        axs[i].bar(x - width/2, avg_simulations, width, yerr=std_simulations, label='Simulation')
        axs[i].bar(x + width/2, avg_renderings, width, yerr=std_renderings, label='Rendering')

        # Add some text for labels, title and custom x-axis tick labels, etc.
        axs[i].set_xlabel('Problem Sizes (Events)')
        axs[i].set_ylabel('Duration (s)')
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

def plot_percentage_difference(all_data, label_keyword):
    # Filter data on the rule that the label_keyword must be regex substring of the test_case_label
    all_data = {k: v for k, v in all_data.items() if label_keyword in k}
    
    # Calculate the number of rows and columns for the subplots
    num_test_cases = len(all_data)
    cols = int(np.ceil(np.sqrt(num_test_cases)/2)*2)
    if(cols == 0):
        return
    rows = int(np.ceil(num_test_cases / cols))

    fig, axs = plt.subplots(rows, cols, figsize=(15, 7))
    axs = axs.flatten()  # Flatten the array of axes to make it easier to iterate over

    for i, (test_case_label, test_runs) in enumerate(sorted(all_data.items(), key=lambda item: item[0])):
        
        data = []
        for j, (problem_size, durations) in enumerate(sorted(test_runs.items(), key=lambda item: int(item[0]))):
            sim_durations, rend_durations = zip(*durations)
            label = f"{problem_size}"
            avg_difference = np.average([sim - rend for sim, rend in zip(sim_durations, rend_durations)]) / np.average(sim_durations) * 100
            sdr_difference = np.std([sim - rend for sim, rend in zip(sim_durations, rend_durations)]) / np.average(sim_durations) * 100
            data.append((label, avg_difference, sdr_difference))
            
        labels, avg_differences, std_differences = zip(*data)
        x = np.arange(len(labels))  # the label locations
        width = 0.35  # the width of the bars
        axs[i].bar(x, avg_differences, width, yerr=std_differences, label='Percentage Difference')

        # Add some text for labels, title and custom x-axis tick labels, etc.
        axs[i].set_xlabel('Problem Sizes (Events)')
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
    
def plot_metrics_over_time(metrics_data, desired_problem_size, label_keyword):
    metrics = ['framesPerSecond', 'messagesPerSecond', 'eventsPerSecond', 'tracksPerSecond']
    metric_labels = ['Frames/s', 'Messages/s', 'Events/s', 'Tracks/s']
    num_metrics = len(metrics)
    cols = int(np.ceil(np.sqrt(num_metrics)))
    if(cols == 0):
        return
    rows = int(np.ceil(num_metrics / cols))

    # Group data by problem size
    problem_sizes = {}
    for test_case_label, runs in metrics_data.items():
        # Filter data on the rule that the label_keyword must be regex substring of the test_case_label
        if label_keyword not in test_case_label:
            continue
        for run in runs:
            problem_size = run['problemSize']
            if problem_size not in problem_sizes:
                problem_sizes[problem_size] = []
            problem_sizes[problem_size].append((test_case_label, run))
    if desired_problem_size not in problem_sizes:
        return
    test_cases = problem_sizes[desired_problem_size]
    fig, axs = plt.subplots(rows, cols, figsize=(15, 7), squeeze=False)
    axs = axs.flatten()

    for i, metric in enumerate(metrics):
        for test_case_label, run in test_cases:
            if metric in run:
                times = [entry['time'] for entry in run[metric]]
                values = [entry['newValues'] for entry in run[metric]]

                # Normalize times to start at 0 and convert to seconds
                times = [(t - times[0]) / 1000 for t in times]
                
                # Calculate marching average metric per second
                values = [sum(values[:i+1]) / (times[i] + 1) for i in range(len(values))]

                axs[i].plot(times, values, label=f'{test_case_label}')

        axs[i].set_xlabel('Time (s)')
        axs[i].set_ylabel(metric_labels[i])
        axs[i].set_title(f'{metric} Over Time for {desired_problem_size} Events')
        axs[i].legend()
        axs[i].grid(True)

    # Remove unused subplots
    for i in range(num_metrics, rows*cols):
        fig.delaxes(axs[i])

    plt.tight_layout()
    plt.show()

def plot_stacked_bar_chart(stacked_bar_data, problem_sizes, label_keyword):
    # Group data by problem size
    grouped_data = {}
    for data in stacked_bar_data:
        problem_size = data['problemSize']
        if problem_size not in problem_sizes:
            continue
        if problem_size not in grouped_data:
            grouped_data[problem_size] = []
        grouped_data[problem_size].append(data)
    

    # Calculate the number of rows and columns for the subplots
    num_problem_sizes = len(grouped_data)
    cols = int(np.ceil(np.sqrt(num_problem_sizes)))
    if(cols == 0):
        return
    rows = int(np.ceil(num_problem_sizes / cols))

    fig, axs = plt.subplots(rows, cols, figsize=(12, 12))
    axs = axs.flatten()  # Flatten the array of axes to make it easier to iterate over

    for i, (problem_size, data) in enumerate(sorted(grouped_data.items(), key=lambda item: item[0])):
        df = pd.DataFrame(data)
        # drop columns where label_keyword is not a substring of the Config
        df = df[df['Config'].str.contains(label_keyword)]
        # sort columns by total time spent
        df = df.sort_values(by=['Config'], ascending=False)
        df.set_index('Config', inplace=True)
        # plot without the total time and problem size
        df.drop(columns=['Total Time', 'problemSize'], inplace=True)
        df.plot(kind='bar', stacked=True, ax=axs[i])

        axs[i].set_title(f'Stacked Bar Chart of Time Distribution for Problem Size {problem_size}')
        axs[i].set_xlabel('Configurations')
        axs[i].set_ylabel('Time (ms)')
        axs[i].set_xticklabels(df.index, rotation=45, ha='right')
        axs[i].legend(title='Time Spent on')

    # Remove unused subplots
    for i in range(num_problem_sizes, rows*cols):
        fig.delaxes(axs[i])

    plt.tight_layout()
    plt.show()

# Directory containing JSON files
directory = 'logs'

# Load data from all files
all_data, aspect_data, metrics_data, stacked_bar_data = load_data_from_files(directory)

plot_durations(all_data, '1e3_proton')
plot_durations(all_data, '1e3_electron')
plot_percentage_difference(all_data, '1e3_proton')
plot_percentage_difference(all_data, '1e3_electron')
# plot_stacked_bar_chart(stacked_bar_data, [8, 64, 256, 1024], '1e3_electron')
# plot_stacked_bar_chart(stacked_bar_data, [8, 64, 256, 1024], '1e1_electron')
# plot_stacked_bar_chart(stacked_bar_data, [8, 1024, 4096, 16384], '1e3_proton')
# plot_stacked_bar_chart(stacked_bar_data, [8, 1024, 4096, 16384], '1e1_proton')
# plot_metrics_over_time(metrics_data, 256, '1e3')
# plot_metrics_over_time(metrics_data, 1024, '1e3')
# plot_metrics_over_time(metrics_data, 4096, '1e3')
# plot_metrics_over_time(metrics_data, 16384, '1e3')
# plot_aspects(aspect_data, "1e0_electron_all_optimized_1024")
# plot_aspects(aspect_data, "1e0_electron_all_raw_1024")
# plot_aspects(aspect_data, "1e3_electron_all_optimized_1024")
# plot_aspects(aspect_data, "1e3_electron_all_optimized_1024")
# plot_aspects(aspect_data, "1e3_proton_all_optimized_1024")
# plot_aspects(aspect_data, "1e3_electron_new_optimized_1024")
# plot_aspects(aspect_data, "1e3_proton_new_optimized_1024")