import shutil
from sys import stderr, stdout, platform

def safe_get_terminal_columns(default=80):
    try:
        return shutil.get_terminal_size().columns
    except OSError:
        return default  # fallback if no terminal

def log_message(message="", show=True, err=False, recur=False, prefix=True):
    """Simple print wrapper"""

    if not show:
        return
    out = stdout
    if err:
        out = stderr
    end = '\n'
    if recur:
        end = '\r'
        if platform == "win32":
            message = ''.join(['\r', message])
        cols = safe_get_terminal_columns()  # ✅ use safe function
        if cols < len(message):
            message = message[:cols]
    if prefix:
        message = ' '.join(["[sstv]", message])

    print(message, file=out, end=end)


def progress_bar(progress, complete, message="", show=True):
    """Simple loading bar"""

    if not show:
        return

    message_size = len(message) + 7  # prefix size
    cols = safe_get_terminal_columns()  # ✅ use safe function
    percent_on = True
    level = progress / complete
    bar_size = min(cols - message_size - 10, 100)
    bar = ""

    if bar_size > 5:
        fill_size = round(bar_size * level)
        bar = "[{}]".format(''.join(['#' * fill_size,
                                     '.' * (bar_size - fill_size)]))
    elif bar_size < -3:
        percent_on = False

    percent = ""
    if percent_on:
        percent = "{:4d}%".format(int(level * 100))

    align = cols - message_size - len(percent)
    not_end = not progress == complete
    log_message("{}{:>{width}}{}".format(message, bar, percent, width=align),
                recur=not_end)
