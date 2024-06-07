import json
import os
import matplotlib.pyplot as plt
import numpy as np
import matplotlib.patches as mpatches
import matplotlib.colors as mcolors
import pandas as pd
import matplotlib.ticker as ticker

# Define hatches
hatch = ['**', '\\\\\\\\', '////', 'OO', 'oo', '++', 'xxx', '..',  '---', '|||']

# Define line styles
line_styles = [(0, (1, 10)), (0, (5, 10)), (0, (3, 10, 1, 10)), (0, (3, 10, 1, 10, 1, 10)), (0, ())]
line_styles = ['dashed']

# Define marker styles
marker_styles = ['o', 's', 'D', 'v', '^', '<', '>', 'p', 'P', '*', 'h', 'H', 'X']

# Define color palette
color_palette = list(mcolors.TABLEAU_COLORS.keys())
# define shades of grey color palette
# color_palette = ['darkgray', 'dimgray', 'lightgray', 'gainsboro']
# define blueish color palette
# color_palette = ['skyblue', 'steelblue', 'dodgerblue', 'royalblue', 'deepskyblue', 'cornflowerblue', 'mediumslateblue', 'slateblue', 'darkslateblue', 'midnightblue']

def darker_color(color):
    return mcolors.to_rgb(color) * np.array([0.5, 0.5, 0.5])

def log_series(obj, key, value):
    if key in obj:
        obj[key].append(value)
    else:
        obj[key] = [value]

def log_series_dict(obj, keyA, keyB, value):
    if keyA in obj:
        log_series(obj[keyA], keyB, value)
    else:
        obj[keyA] = {keyB: [value]}
    

def load_data_from_files(directory):
    config_comparison_data_over_problem_size = {}
    config_comparison_data_over_bin_size = {}

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
                        if 'scheduledEvents' not in config:
                            continue
                        problem_size = int(config['scheduledEvents'])
                        bin_size_data = config['binSizeCategory'].split('e')
                        bin_size = int(bin_size_data[0]) * 10**int(bin_size_data[1])
                        beam_particle = config['beamParticle']
                        render_mode = config['renderMode']
                        trajectory_optimization = config['trajectoryOptimization']
                        problem_case_label = f"{bin_size}_{beam_particle}_{render_mode}_{trajectory_optimization}"
                        bin_case_label = f"{problem_size}_{beam_particle}_{render_mode}_{trajectory_optimization}"
                        start_time = log['startTime']
                        end_time = log['endTime']
                        render_end_time = log['renderEndTime']
                        
                        total_duration = render_end_time - start_time
                        simulation_duration = end_time - start_time
                        
                        optimization_time = sum(entry['timeEnd'] - entry['timeStart'] for entry in log['optimizations'])
                        rendering_time = sum(entry['timeEnd'] - entry['timeStart'] for entry in log['renders'])
                        data_handling_time = sum(entry['timeEnd'] - entry['timeStart'] for entry in log['handles'])
                        initialization_time = total_duration - optimization_time - rendering_time - data_handling_time 
                        
                        message_wait_logs = []
                        main_loop_logs = []
                        for entry in log['messages']:
                            time = entry['timeStart'] - start_time
                            difference = 1
                            size_difference = entry['packageSize']
                            message_wait_logs.append((int(time), difference, size_difference))
                        message_wait_logs.sort(key=lambda x: x[0])
                        curr_id = 0
                        prev_messages = 0
                        sorted_main_loop_logs = sorted(log['mainLoopLogs'], key=lambda x: x['timeEnd'])
                        # print out bad values
                        # if(max([int(entry['messages']) for entry in sorted_main_loop_logs]) != problem_size):
                        #     print(max([int(entry['messages']) for entry in sorted_main_loop_logs]), problem_size, problem_case_label)
                        for entry in sorted_main_loop_logs:
                            main_loop_difference = int(entry['messages']) - prev_messages
                            prev_messages = int(entry['messages'])
                            if(main_loop_difference == 0):
                                continue
                            time = int(entry['timeEnd']) - start_time
                            # size difference is the sum size of all messages from the curr_id to the curr_id - difference
                            size_difference = sum([x[2] for x in message_wait_logs[curr_id:curr_id+main_loop_difference]])
                            curr_id += main_loop_difference
                            main_loop_logs.append((int(time), -main_loop_difference, -size_difference))
                        
                        # merge the two lists
                        message_logs = message_wait_logs + main_loop_logs + [(0, 0, 0),(total_duration, 0, 0)]
                        message_logs.sort(key=lambda x: x[0])
                        
                        # serialize the message data to the current amount of messages and the size of the messages in bytes in the every timestep it changes
                        massages_over_time = []
                        current_messages = 0
                        current_size = 0
                        for entry in message_logs:
                            current_messages += entry[1]
                            current_size += entry[2]
                            massages_over_time.append((entry[0], current_messages, current_size))
                        
                        frames_per_second = [(entry['elapsed'], entry['newValues'], entry['time'] - start_time) for entry in log['framesPerSecond']][:-1]
                        
                        serialized_data = {
                            'total_duration': total_duration,
                            'simulation_duration': simulation_duration,
                            'optimization_time': optimization_time,
                            'rendering_time': rendering_time,
                            'data_handling_time': data_handling_time,
                            'initialization_time': initialization_time,
                            'messages_over_time': massages_over_time,
                            'frames_per_second': frames_per_second,
                        }
                        log_series_dict(config_comparison_data_over_problem_size, problem_case_label, problem_size, serialized_data)
                        log_series_dict(config_comparison_data_over_bin_size, bin_case_label, bin_size, serialized_data)
    return config_comparison_data_over_problem_size, config_comparison_data_over_bin_size

def compare_config_time(data, time_key, config_substring, title, xlabel, xbase, series_labels=None):
    # filter data keys that contain the config substring
    filtered_keys = [key for key in data.keys() if config_substring in key]
    
    # define figure size
    plt.figure(figsize=(16, 7))
    
    for series in filtered_keys:
        series_data = data[series]
        series_label = series if series_labels is None else series_labels[filtered_keys.index(series)]
        
        # calculate mean and standard deviation for each problem size
        mean_data = {}
        std_data = {}
        x_values = sorted(series_data.keys(), key=lambda x: int(x))
        for x_value, data_list in series_data.items():
            mean_data[x_value] = np.mean([entry[time_key] for entry in data_list])
            std_data[x_value] = np.std([entry[time_key] for entry in data_list])
        
        # plot the data as a dashed line plot with error bars for the standard deviation
        color = color_palette[filtered_keys.index(series) % len(color_palette)]
        line_style = line_styles[filtered_keys.index(series) % len(line_styles)]
        marker = marker_styles[filtered_keys.index(series) % len(marker_styles)]
        plt.errorbar(x_values, [mean_data[x] for x in x_values], label=series_label, color=color, linestyle=line_style, marker=marker, markersize=8, capsize=3)
        # plot with error Bars with Fill Area with lighter color
        plt.fill_between(x_values, [mean_data[x] - std_data[x] for x in x_values], [mean_data[x] + std_data[x] for x in x_values], color=color, alpha=0.25)

    plt.title(title)
    plt.ylabel('Czas (s)')
    plt.xlabel(xlabel)
    plt.grid(True, axis='y')
    plt.yscale('log', base=2)
    plt.xscale('log', base=xbase)
    plt.legend(title='Konfiguracja', prop={'size': 12})
    plt.show()

def stack_times_of_run(data, config_substring, x_value, title, ylabels=None):
    # filter data keys that contain the config substring
    filtered_keys = [key for key in data.keys() if config_substring in key and 'none' not in key]
    print(filtered_keys)
    # define the order of the stacked bars
    bar_order = ['data_handling_time', 'optimization_time', 'rendering_time', 'initialization_time']
    bar_labels = ['Obsługa danych', 'Optymalizacja', 'Renderowanie', 'Oczekiwanie']
    
    
    
    # create a DataFrame for the filtered data
    mean_data = []
    for key in filtered_keys:
        series_data = data[key]
        if x_value in series_data:
            data_list = series_data[x_value]
            mean_data.append({
                'config': key,
                'initialization_time': np.mean([entry['initialization_time'] for entry in data_list])/1000,
                'data_handling_time': np.mean([entry['data_handling_time'] for entry in data_list])/1000,
                'optimization_time': np.mean([entry['optimization_time'] for entry in data_list])/1000,
                'rendering_time': np.mean([entry['rendering_time'] for entry in data_list])/1000
            })
    df = pd.DataFrame(mean_data)
    if ylabels is not None:
        # assign ylabels to the config column
        df['config'] = ylabels
    df.set_index('config', inplace=True)
    # reorder the DataFrame columns to match the bar order
    df = df[bar_order]
    
    df.columns = bar_labels
    
    # plot the DataFrame as a stacked bar plot
    bars = df.plot(kind='bar', stacked=True, figsize=(10, 12))
    for stack_num, bar in enumerate(bars.containers):
        color = color_palette[stack_num % len(color_palette)]
        hatch_literal = hatch[stack_num % len(hatch)]
        for patch in bar.patches:
            patch.set_hatch(hatch_literal)
            patch.set_facecolor(color)
            patch.set_edgecolor(darker_color(color))
    bars.set_xticklabels(df.index, rotation=0, ha='center')
    
    plt.title(title)
    plt.xlabel('Konfiguracja')
    plt.grid(True, axis='y')
    plt.ylabel('Czas (s)')
    plt.legend(title='Czas poświęcony na:', prop={'size': 12})
    plt.show()

def compare_messages_with_frames(series_data, title, ylabels=None):
    
    # plot line of the marching average of the frames per second
    fig, ax1 = plt.subplots(figsize=(16, 7))
    
    # calculate the moving average of the frames per second
    # window size should be dynamic based on the time between log entries
    # target time should be 1 second
    moving_average = []
    time_window_size = 5000.0
    current_sum = []
    current_time = []
    for elapsed, new_values, time in series_data['frames_per_second']:
        while(len(current_time) > 0 and sum(current_time) >= time_window_size):
            current_sum = current_sum[1:]
            current_time = current_time[1:]
        current_time.append(elapsed)
        current_sum.append(new_values*1.0)
        moving_average.append((time, np.mean(current_sum)*sum(current_time)/1000))
    
    # plot the moving average
    x_values, y_values = zip(*moving_average)
    frames_color = color_palette[0]
    ax1.plot(np.array(x_values)/1000, y_values, label='Średnia liczba klatek na sekundę', color=frames_color, linestyle='dashed', linewidth=1)
    # fill the area under the line
    ax1.fill_between(np.array(x_values)/1000, y_values, 0, color=frames_color, alpha=0.3)
    
    # annotate max value for moving average
    max_fps = max(y_values)
    max_fps_index = y_values.index(max_fps)
    ax1.annotate(f'Maksimum: {max_fps:.2f} FPS', xy=(x_values[max_fps_index]/1000, max_fps), xytext=(-90, 15), textcoords='offset points',
                    arrowprops=dict(facecolor='black', arrowstyle='->'))

    # annotate final FPS value
    final_fps = y_values[-1]
    ax1.annotate(f'Końcowa wartość:\n{final_fps:.2f} FPS', xy=(x_values[-1]/1000, final_fps), xytext=(-65, 50), textcoords='offset points',
                 arrowprops=dict(facecolor='blue', arrowstyle='->'))
        
    # plot the messages over time
    x_values, y_values, size_values = zip(*series_data['messages_over_time'])
    messages_color = color_palette[1]
    size_values_MB = [size / (1024 * 1024) for size in size_values]  # convert size from bytes to megabytes
    ax2 = ax1.twinx()  # instantiate a second axes that shares the same x-axis
    ax2.plot(np.array(x_values)/1000, size_values_MB, label='Rozmiar oczekujących wiadomości', color=messages_color, linestyle='solid', linewidth=.5)
    ax2.fill_between(np.array(x_values)/1000, size_values_MB, 0, color=messages_color, alpha=0.3)    
    
    # annotate max value for message size
    max_size = max(size_values_MB)
    max_size_index = size_values_MB.index(max_size)
    ax2.annotate(f'Maksimum: {max_size:.2f} MB', xy=(x_values[max_size_index]/1000, max_size), xytext=(-90, 15), textcoords='offset points',
                 arrowprops=dict(facecolor='red', arrowstyle='->'))
    
    ax1.set_title(title)
    ax1.set_xlabel('Czas (s)')
    ax1.set_ylabel('Wartość metryki (FPS)')
    ax2.set_ylabel('Ilość danych (MB)')  # we already handled the x-label with ax1
    ax1.grid(True)
    
    # increase y-axis limits to add more space for the legend frames
    ax1.set_ylim([-max_fps/10, max_fps * 1.2])  # increase y-axis limit by 20%
    ax2.set_ylim([-max_size/10, max_size * 1.2])  # increase y-axis limit by 20%
    
    # add legends for both y axes
    ax1.legend(loc='upper left')
    ax2.legend(loc='upper left', bbox_to_anchor=(0, 0.9))
    
    plt.show()

data_problem_size, data_bin_size = load_data_from_files('logs')

# compare_config_time(data_problem_size, 'total_duration', '50_proton', 'Całkowity czas symulacji protonów w siatce $50^3$ w stosunku do ilości zdarzeń', 'Ilość symulowanych zdarzeń', 2, [
#     'Tylko optymalizacja', 'Bez optymalizacji', 'Optymalizacja + pomijanie czyszczenia bufora', 'Tylko pomijanie czyszczenia bufora', 'Symulacja bez renderowania'
# ])
# compare_config_time(data_bin_size, 'total_duration', '16384_proton', 'Całkowity czas w stosunku do gęstości siatki detekcji', 'Gęstość siatki detekcji ($N \\times N \\times N $)', 10)

# stack_times_of_run(data_problem_size, '1000_proton', 16_384, 'Czas poświęcony na poszczególne etapy symulacji protonów w siatce $1000^3$', [
#     'Tylko optymalizacja', 'Bez optymalizacji', 'Optymalizacja'"\n"'+ pomijanie'"\n"'czyszczenia bufora', 'Tylko pomijanie'"\n"'czyszczenia bufora'
# ])

compare_messages_with_frames(data_problem_size['50_proton_all_optimized'][32_768][0], 'Liczba oczekujących wiadomości i rozmiar wiadomości w zależności od czasu symulacji protonów w siatce $16^3$')

compare_messages_with_frames(data_problem_size['50_proton_new_optimized'][32_768][0], 'Liczba oczekujących wiadomości i rozmiar wiadomości w zależności od czasu symulacji protonów w siatce $16^3$')

# compare_messages_with_frames(data_problem_size['50_proton_all_optimized'][8][0], 'Liczba oczekujących wiadomości i rozmiar wiadomości w zależności od czasu symulacji protonów w siatce $16^3$')
