from tqdm import tqdm  # For progress bar
"""
class to display progress
"""
class ProgressPercentage(object):
    def __init__(self, file_size):
        self._size = file_size
        self._seen_so_far = 0
        self._progress = create_progress_bar(file_size)

    def __call__(self, bytes_amount):
        self._seen_so_far += bytes_amount
        self._progress.update(bytes_amount)

    def __del__(self):
        self._progress.close() 

def create_progress_bar(file_size):
    progress_bar = tqdm(total= file_size, unit='B', unit_scale=True, desc="Progress", smoothing=0.0,
                              bar_format="{l_bar}\033[1;32m{bar}\033[0m| {n_fmt}/{total_fmt} [elapsed: {elapsed} | remaining: {remaining}, {rate_fmt}]")
    return progress_bar