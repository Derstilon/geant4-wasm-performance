import json
import os
import matplotlib.pyplot as plt
import numpy as np
import matplotlib.patches as mpatches
import matplotlib.colors as mcolors
import pandas as pd
import matplotlib.ticker as ticker

hatch = ['**', '\\\\\\\\', '////', 'OO', 'oo', '++', 'xxx', '..',  '---', '|||']

# Define color palette
color_palette = list(mcolors.TABLEAU_COLORS.keys())
# define shades of grey color palette
color_palette = ['dimgray', 'darkgray', 'lightgray', 'gainsboro']
# define blueish color palette
color_palette = ['steelblue', 'skyblue', 'dodgerblue', 'deepskyblue', 'royalblue', 'cornflowerblue', 'mediumslateblue', 'slateblue', 'darkslateblue', 'midnightblue']

def darker_color(color):
    return mcolors.to_rgb(color) * np.array([0.5, 0.5, 0.5])
    
def testcase_to_title(beamParticle, renderMode, trajectoryOptimization, binSizeCategory, scheduledEvents, mode=0):
    if mode == 0:
        title = f"""{
            'Optimized rendering' if trajectoryOptimization == 'optimized' else 'Rendering'
            } of{(' $2^{'+ str(int(np.log2(int(scheduledEvents)))) +'}$') if scheduledEvents is not None else ''} {
            (beamParticle+'s') if beamParticle is not None else 'particles'}{
            (' in grid of size $'+binSizeCategory[0]+'*10^{'+binSizeCategory[2:]+'}$') if binSizeCategory is not None else ''}{
                ' without clearing the frame buffer' if renderMode == 'new' else ' with clearing the frame buffer' if renderMode == 'all' else ''
            }"""
        return title
    elif mode == 1:
        title = f"""{
            'Optimized' if trajectoryOptimization == 'optimized' else 'Not optimized'
            }{(' $2^{'+ str(int(np.log2(int(scheduledEvents)))) +'}$') if scheduledEvents is not None else ''}{
            (' '+beamParticle+'s') if beamParticle is not None else ''}{
            (' in grid of size $'+binSizeCategory[0]+'*10^{'+binSizeCategory[2:]+'}$') if binSizeCategory is not None else ''}{
                ' without clearing the frame buffer' if renderMode == 'new' else ' with clearing the frame buffer' if renderMode == 'all' else ''
            }"""
        return title

def load_data_from_files(directory):
    all_data = {}
    aspect_data = {}
    bin_data = {}
    metrics_data = {}
    stacked_bar_temp = {}

    dir_list = sorted([d for d in os.listdir(directory) if os.path.isdir(os.path.join(directory, d))])
    for dir_name in dir_list:
        dir_path = os.path.join(directory, dir_name)
        # sort by length of filename then by filename to ensure that the order of the files is consistent
        for filename in sorted(os.listdir(dir_path), key=lambda x: (len(x), x)):
            if filename.endswith(".json"):
                filepath = os.path.join(dir_path, filename)
                with open(filepath) as f:
                    data = json.load(f)
                    if 'config' in data:
                        config = data['config']
                        log = data['log']
                        if 'scheduledEvents' not in config or config['renderMode'] == "none":
                            continue
                        problem_size = config['scheduledEvents']
                        bin_size = config['binSizeCategory']
                        test_case_label = f"{config['binSizeCategory']}_{config['beamParticle']}_{config['renderMode']}_{config['trajectoryOptimization']}"
                        bin_case_label = f"{problem_size}_{config['beamParticle']}_{config['renderMode']}_{config['trajectoryOptimization']}"
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
                        
                        if bin_case_label not in bin_data:
                            bin_data[bin_case_label] = {}
                        if bin_size not in bin_data[bin_case_label]:
                            bin_data[bin_case_label][bin_size] = []
                        bin_data[bin_case_label][bin_size].append((simulation_duration, rendering_duration))
                        
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

                        # Collect data for stacked bar chart in temporary dictionary
                        key = (test_case_label, problem_size)
                        if key not in stacked_bar_temp:
                            stacked_bar_temp[key] = {
                                'Optimization Time': [],
                                'Render Time': [],
                                'Handle Time': []
                            }
                        stacked_bar_temp[key]['Optimization Time'].append(total_optimization_time)
                        stacked_bar_temp[key]['Render Time'].append(total_render_time)
                        stacked_bar_temp[key]['Handle Time'].append(total_handle_time)

    # Calculate averages and store in stacked_bar_data
    stacked_bar_data = []
    for (test_case_label, problem_size), times in stacked_bar_temp.items():
        avg_optimization_time = np.mean(times['Optimization Time'])
        avg_render_time = np.mean(times['Render Time'])
        avg_handle_time = np.mean(times['Handle Time'])
        std_total_time = np.std([total_time for total_time in times['Optimization Time'] + times['Render Time'] + times['Handle Time']])
        stacked_bar_data.append({
            'Config': test_case_label,
            'Optimization Time': avg_optimization_time,
            'Render Time': avg_render_time,
            'Handle Time': avg_handle_time,
            'Total Time': avg_optimization_time + avg_render_time + avg_handle_time,
            'Std Total Time': std_total_time,
            'problemSize': problem_size,
        })
    
    return all_data, aspect_data, metrics_data, stacked_bar_data, bin_data

def plot_bin_durations(bin_data, label_keyword):
    # Filter data on the rule that the label_keyword must be regex substring of the test_case_label
    all_data = {k: v for k, v in bin_data.items() if label_keyword in k}
    
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
        for j, (bin_size, durations) in enumerate(sorted(test_runs.items(), key=lambda item: item[0])):
            sim_durations, rend_durations = zip(*durations)
            label = f"${((bin_size[0] + '*') if bin_size[0] != '1' else '')}10^{{{bin_size[2:]}}}$"
            
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
        bar_hatches = ['xxx', '...']
        bar_colors=[color_palette[0], color_palette[1]]
        axs[i].bar(x - width/2, avg_simulations, width, yerr=std_simulations, label='Simulation', hatch=bar_hatches[0], color=bar_colors[0], edgecolor=darker_color(bar_colors[0]))
        axs[i].bar(x + width/2, avg_renderings, width, yerr=std_renderings, label='Rendering', hatch=bar_hatches[1], color=bar_colors[1], edgecolor=darker_color(bar_colors[1]))
        args = test_case_label.split('_')
        title = testcase_to_title(beamParticle=args[1], renderMode=args[2], trajectoryOptimization=args[3], binSizeCategory=None, scheduledEvents=args[0])
        # Add some text for labels, title and custom x-axis tick labels, etc.
        axs[i].set_xlabel('Amount of detector bins in each dimension')
        axs[i].set_ylabel('Duration (s)')
        axs[i].set_yscale('log', base=2)
        axs[i].set_title(title)
        axs[i].set_xticks(x)
        axs[i].set_xticklabels(labels)
        axs[i].legend()
        axs[i].grid(True, axis='y')  # Add horizontal grid only

    # Remove unused subplots
    for i in range(num_test_cases, rows*cols):
        fig.delaxes(axs[i])

    plt.tight_layout()
    plt.show()
    

def plot_durations(all_data, label_keyword):
    # Filter data on the rule that the label_keyword must be regex substring of the test_case_label
    all_data = {k: v for k, v in all_data.items() if label_keyword in k}
    
    # Calculate the number of rows and columns for the subplots
    num_test_cases = len(all_data)
    cols = int(np.ceil(np.sqrt(num_test_cases)/2)*2)
    if(cols == 0):
        return
    rows = int(np.ceil(num_test_cases / cols))

    fig, axs = plt.subplots(rows, cols, figsize=(17, 8))
    axs = axs.flatten()  # Flatten the array of axes to make it easier to iterate over

    for i, (test_case_label, test_runs) in enumerate(sorted(all_data.items(), key=lambda item: item[0])):
        
        data = []
        for j, (problem_size, durations) in enumerate(sorted(test_runs.items(), key=lambda item: int(item[0]))):
            sim_durations, rend_durations = zip(*durations)
            exponent = str(int(np.log2(int(problem_size))))
            label = f'$2^{{{exponent}}}$'
            
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
        bar_hatches = ['xxx', '...']
        bar_colors=[color_palette[0], color_palette[1]]
        axs[i].bar(x - width/2, avg_simulations, width, yerr=std_simulations, label='Simulation', hatch=bar_hatches[0], color=bar_colors[0], edgecolor=darker_color(bar_colors[0]))
        axs[i].bar(x + width/2, avg_renderings, width, yerr=std_renderings, label='Rendering', hatch=bar_hatches[1], color=bar_colors[1], edgecolor=darker_color(bar_colors[1]))
        args = test_case_label.split('_')
        title = testcase_to_title(beamParticle=args[1], renderMode=args[2], trajectoryOptimization=args[3], binSizeCategory=args[0], scheduledEvents=None)
        # Add some text for labels, title and custom x-axis tick labels, etc.
        # use proton or electron as the x-axis label based on what is in the test_case_label
        axs[i].set_xlabel('Amount of Events (Protons)' if 'proton' in test_case_label else 'Amount of Events (Electrons)')
        axs[i].set_ylabel('Duration (s)')
        axs[i].set_yscale('log', base=2)
        axs[i].set_title(title)
        axs[i].set_xticks(x)
        axs[i].set_xticklabels(labels)
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
        args = test_case_label.split('_')
        title = testcase_to_title(beamParticle=args[1], renderMode=args[2], trajectoryOptimization=args[3], binSizeCategory=args[0], scheduledEvents=None)
        # Add some text for labels, title and custom x-axis tick labels, etc.
        axs[i].set_xlabel('Amount of Events (Protons)' if 'proton' in test_case_label else 'Amount of Events (Electrons)')
        axs[i].set_ylabel('Percentage Difference (%)')
        axs[i].set_title(title)
        axs[i].set_xticks(x)
        axs[i].set_xticklabels(labels, rotation=45)
        axs[i].legend()
        axs[i].grid(True, axis='y')  # Add horizontal grid only

    # Remove unused subplots
    for i in range(num_test_cases, rows*cols):
        fig.delaxes(axs[i])

    plt.tight_layout()
    plt.show()
    
def plot_comparative_percentage_difference(all_data, label_keywords):
    all_data_filtered = []
    for keyword in label_keywords:
        # Calculate the number of rows and columns for the subplots
        data_filtered = {k: v for k, v in all_data.items() if keyword in k}
        if len(data_filtered) > 0:
            all_data_filtered.append(data_filtered)
    
    num_test_cases = len(all_data_filtered)
    cols = int(np.ceil(np.sqrt(num_test_cases)))
    if(cols == 0):
        return
    rows = int(np.ceil(num_test_cases / cols))

    fig, axs = plt.subplots(rows, cols, figsize=(15, 7))
    axs = axs.flatten() if num_test_cases > 1 else [axs]  # Flatten the array of axes to make it easier to iterate over
    
    for i, data_filtered in enumerate(all_data_filtered):
        keywords = label_keywords[i].split('_')
        width = 0.2  # the width of the bars
        num_bars = 3#len(data_filtered.items())
        for j, (test_case_label, test_runs) in enumerate(sorted(data_filtered.items(), key=lambda item: item[0])):
            data = []
            for problem_size, durations in sorted(test_runs.items(), key=lambda item: int(item[0])):
                sim_durations, rend_durations = zip(*durations)
                label = f"{problem_size}"
                avg_difference = np.average([(rend - sim) / sim * 100 for sim, rend in zip(sim_durations, rend_durations)])
                data.append((label, avg_difference))
            
            series_args = test_case_label.split('_')
            series_title = testcase_to_title(
                beamParticle=series_args[1] if series_args[1] not in keywords else None, 
                renderMode=series_args[2] if series_args[2] not in keywords else None, 
                trajectoryOptimization=series_args[3] if series_args[3] not in keywords else None, 
                binSizeCategory=series_args[0] if series_args[0] not in keywords else None, 
                scheduledEvents=None,
                mode=1
            )
            
            labels, avg_differences = zip(*data)
            x = np.arange(len(labels))  # the label locations
            # Adjust x values for each bar so they are centered
            x = x + j * width
            axs[i].bar(x, avg_differences, width, label=series_title, align='center')
            
        args = test_case_label.split('_')

        title = testcase_to_title(
            beamParticle=args[1] if args[1] in keywords else None, 
            renderMode=args[2] if args[2] in keywords else None, 
            trajectoryOptimization=args[3] if args[3] in keywords else None, 
            binSizeCategory=args[0] if args[0] in keywords else None, 
            scheduledEvents=None
        )
        # Add some text for labels, title and custom x-axis tick labels, etc.
        axs[i].set_xlabel('Amount of Events (Protons)' if 'proton' in test_case_label else 'Amount of Events (Electrons)')
        axs[i].set_ylabel('Percentage Difference (%)')
        axs[i].set_yscale('log', base=2)
        axs[i].set_title(title)
        axs[i].set_xticks(x - width * num_bars / 2.0 )
        axs[i].set_xticklabels(labels, rotation=45)
        axs[i].legend()
        axs[i].grid(True, axis='y')  # Add horizontal grid only
        
        
    # Add main title to the diagram
    fig.suptitle('Comparative Percentage Difference', fontsize=16)

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
    else:
        return

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
    test_cases = sorted(problem_sizes[desired_problem_size],  key=lambda x: x[0])
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

    fig, axs = plt.subplots(rows, cols, figsize=(18, 12))
    axs = axs.flatten()  # Flatten the array of axes to make it easier to iterate over

    for i, (problem_size, data) in enumerate(sorted(grouped_data.items(), key=lambda item: item[0])):
        df = pd.DataFrame(data)
        # drop columns where label_keyword is not a substring of the Config
        df = df[df['Config'].str.contains(label_keyword)]
        # sort columns by total time spent
        df = df.sort_values(by=['Config'], ascending=False)
        # change order of series
        df.set_index('Config', inplace=True)
        # plot without the total time and problem size
        df.drop(columns=['Total Time', 'problemSize'], inplace=True)
        df = df[['Handle Time', 'Optimization Time', 'Render Time']]
        # raname columns for better readability
        df.columns = ['Data handling', 'Optimization', 'Rendering']
        # plt.rcParams['hatch.linewidth'] = 0.75
        bars = df.plot(kind='bar', stacked=True, ax=axs[i])
        for stack_num, bar in enumerate(bars.containers):
            color = color_palette[stack_num % len(color_palette)]
            hatch_literal = hatch[stack_num % len(hatch)]
            for patch in bar.patches:
                patch.set_hatch(hatch_literal)
                patch.set_facecolor(color)
                patch.set_edgecolor(mcolors.to_rgb(color) * np.array([0.5, 0.5, 0.5]))  # darker version for hatch
        
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
    plt.rcParams['hatch.linewidth'] = 1
    
def plot_difference_between_configs(stacked_bar_data, label_keyword):
    # Group data by label
    grouped_data = {}
    for data in stacked_bar_data:
        if label_keyword not in data['Config']:
            continue
        label = data['Config']
        problem_size = data['problemSize']
        # Filter out raw or optimized keyword form label
        new_label = label.replace('_raw', '').replace('_optimized', '')
        if new_label not in grouped_data:
            grouped_data[new_label] = {
            }
        if problem_size not in grouped_data[new_label]:
            grouped_data[new_label][problem_size] = {
            }
        grouped_data[new_label][problem_size]['raw' if 'raw' in label else 'optimized'] = data
        if 'raw' in grouped_data[new_label][problem_size] and 'optimized' in grouped_data[new_label][problem_size]:
            raw = grouped_data[new_label][problem_size]['raw']
            optimized = grouped_data[new_label][problem_size]['optimized']
            saved_time = raw['Total Time'] - optimized['Total Time']
            saved_time_std = np.sqrt(raw['Std Total Time']**2 + optimized['Std Total Time']**2)
            grouped_data[new_label][problem_size]['saved_time'] = saved_time
            grouped_data[new_label][problem_size]['saved_time_std'] = saved_time_std
    
    # Define colors for breakeven points
    colors = list(mcolors.TABLEAU_COLORS.keys())
    
    # Plotting
    for i, (config, data) in enumerate(grouped_data.items()):
        # filter out keys that do not have saved_time defined
        problem_sizes = [size for size in data.keys() if 'saved_time' in data[size]]
        # sort problem sizes
        problem_sizes = sorted(problem_sizes, key=lambda x: int(x))
        # rescale time to seconds
        time_diffs = [data[size]['saved_time'] / 1000.0 for size in problem_sizes]
        time_diffs_std = [data[size]['saved_time_std'] / 1000.0 for size in problem_sizes]
        color = colors[i % len(colors)]

        # plot lines with std yerr
        plt.errorbar(problem_sizes, time_diffs, yerr=time_diffs_std, label=config, color=color)

        # Mark breakeven points
        time_diffs_np = np.array(time_diffs)
        breakeven_points = np.where(np.diff(np.sign(time_diffs_np)))[0]
        for breakeven_point in breakeven_points:
            if time_diffs[breakeven_point] <= 0 and time_diffs[breakeven_point + 1] >= 0:
                plt.plot(problem_sizes[breakeven_point], time_diffs[breakeven_point], 'o', color=color)
                plt.text(problem_sizes[breakeven_point], time_diffs[breakeven_point], str(problem_sizes[breakeven_point]))


    plt.xlabel('Problem Size')
    plt.ylabel('Time Saved (s)')
    plt.title('Time Saved thanks to Optimization')
    plt.grid(True, axis='y')
    plt.xscale('log', base=2)
    plt.legend()
    plt.show()        

# Directory containing JSON files
directory = 'old_logs_2'
directory = 'logs'

# Load data from all files
all_data, aspect_data, metrics_data, stacked_bar_data, bin_data = load_data_from_files(directory)

# plot_durations(all_data, '5e1_proton')
# plot_percentage_difference(all_data, '5e1_proton')
# plot_comparative_percentage_difference(all_data, ['5e1_proton'])
plot_stacked_bar_chart(stacked_bar_data, [16, 32, 64, 128, 256, 512, 1024, 2048], '5e1_proton')
plot_stacked_bar_chart(stacked_bar_data, [ 4_096, 8192, 16_384, 32768, 65_536], '5e1_proton')
# plot_difference_between_configs(stacked_bar_data, '5e1_proton')
# plot_metrics_over_time(metrics_data, 16_384, '5e1_proton')
# plot_aspects(aspect_data, "5e1_proton_all_optimized_16384")
# plot_aspects(aspect_data, "5e1_proton_new_raw_16384")

# plot_durations(all_data, '5e1_proton')
# plot_bin_durations(bin_data, '4096_proton')
# plot_durations(all_data, '1e3_electron')
# plot_percentage_difference(all_data, '5e1_proton')
# plot_percentage_difference(all_data, '1e3_electron')
# plot_comparative_percentage_difference(all_data, ['1e0_electron', '1e1_electron', '1e2_electron', '1e3_electron'])
# plot_comparative_percentage_difference(all_data, ['1e0_proton', '1e1_proton', '1e2_proton', '1e3_proton'])
# plot_stacked_bar_chart(stacked_bar_data, [64, 256, 1024, 4096], 'electron_all')
# plot_stacked_bar_chart(stacked_bar_data, [64, 1024, 4096, 16384], 'proton_all')
# plot_difference_between_configs(stacked_bar_data, '_all')
# plot_difference_between_configs(stacked_bar_data, '_new')
# plot_metrics_over_time(metrics_data, 4096, '1e2_electron')
# plot_metrics_over_time(metrics_data, 4096, '1e1')
# plot_metrics_over_time(metrics_data, 4096, '1e2')
# plot_metrics_over_time(metrics_data, 4096, '1e3')
# plot_metrics_over_time(metrics_data, 16384, '1e3')
# plot_aspects(aspect_data, "1e3_electron_all_optimized_1024")
# plot_aspects(aspect_data, "1e0_electron_all_raw_1024")
# plot_aspects(aspect_data, "1e3_electron_all_optimized_1024")
# plot_aspects(aspect_data, "1e3_electron_all_optimized_1024")
# plot_aspects(aspect_data, "1e3_proton_all_optimized_1024")
# plot_aspects(aspect_data, "1e3_electron_new_optimized_1024")
# plot_aspects(aspect_data, "1e3_proton_new_optimized_1024")