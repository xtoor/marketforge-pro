import matplotlib.pyplot as plt


def plot(series, label: str = None):
    try:
        plt.plot(series, label=label)
        if label:
            plt.legend()
        # Do not show automatically in library code; leave to caller
    except Exception:
        # Fallback to console
        print("plot:", str(series)[:120])



