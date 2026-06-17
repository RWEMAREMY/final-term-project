import json
import math
import random
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "static"
PORT = 8000


COMPONENTS = {
    "student-arrivals": {
        "title": "Student Arrivals",
        "distribution": "Poisson Distribution",
        "reason": "Counts student arrivals per minute.",
        "fields": {
            "mean": {"label": "Mean arrivals / minute", "default": 30, "min": 1, "max": 120},
            "periods": {"label": "Minutes to simulate", "default": 60, "min": 10, "max": 180},
        },
    },
    "cafeteria-queues": {
        "title": "Cafeteria Queues",
        "distribution": "Exponential Distribution",
        "reason": "Models waiting and service times.",
        "fields": {
            "mean": {"label": "Average service time (min)", "default": 3, "min": 0.5, "max": 15},
            "samples": {"label": "Students served", "default": 80, "min": 20, "max": 240},
        },
    },
    "wifi-failures": {
        "title": "WiFi Failures",
        "distribution": "Binomial Distribution",
        "reason": "Models success/failure outcomes for access points.",
        "fields": {
            "devices": {"label": "Network devices", "default": 100, "min": 10, "max": 500},
            "probability": {"label": "Failure probability", "default": 0.02, "min": 0, "max": 1},
            "periods": {"label": "Simulation rounds", "default": 40, "min": 10, "max": 120},
        },
    },
    "shuttle-waits": {
        "title": "Shuttle Bus Waiting Times",
        "distribution": "Uniform Distribution",
        "reason": "Models waits inside a fixed minimum and maximum range.",
        "fields": {
            "minimum": {"label": "Minimum wait (min)", "default": 5, "min": 0, "max": 60},
            "maximum": {"label": "Maximum wait (min)", "default": 15, "min": 1, "max": 90},
            "samples": {"label": "Passengers", "default": 70, "min": 20, "max": 240},
        },
    },
    "parking-occupancy": {
        "title": "Parking Occupancy",
        "distribution": "Binomial Distribution",
        "reason": "Each parking space is occupied or available.",
        "fields": {
            "spaces": {"label": "Parking spaces", "default": 500, "min": 50, "max": 2000},
            "probability": {"label": "Occupancy probability", "default": 0.75, "min": 0, "max": 1},
            "periods": {"label": "Observation rounds", "default": 36, "min": 10, "max": 120},
        },
    },
    "classroom-occupancy": {
        "title": "Classroom Occupancy",
        "distribution": "Normal Distribution",
        "reason": "Attendance tends to cluster around an average.",
        "fields": {
            "mean": {"label": "Mean students", "default": 35, "min": 1, "max": 250},
            "stddev": {"label": "Standard deviation", "default": 5, "min": 0.1, "max": 80},
            "capacity": {"label": "Room capacity", "default": 50, "min": 5, "max": 400},
            "samples": {"label": "Classes", "default": 60, "min": 20, "max": 240},
        },
    },
    "energy-consumption": {
        "title": "Campus Energy Consumption",
        "distribution": "Normal Distribution",
        "reason": "Daily usage fluctuates around a mean value.",
        "fields": {
            "mean": {"label": "Mean kWh / day", "default": 1500, "min": 100, "max": 10000},
            "stddev": {"label": "Standard deviation", "default": 200, "min": 1, "max": 5000},
            "samples": {"label": "Days", "default": 30, "min": 7, "max": 180},
        },
    },
}


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def number(params, key, spec):
    raw = params.get(key, [spec["default"]])[0]
    try:
        value = float(raw)
    except (TypeError, ValueError):
        value = float(spec["default"])
    value = clamp(value, float(spec["min"]), float(spec["max"]))
    return int(value) if float(value).is_integer() and key not in {"probability", "stddev"} else value


def poisson_sample(lam):
    limit = math.exp(-lam)
    product = 1.0
    count = 0
    while product > limit:
        count += 1
        product *= random.random()
    return count - 1


def binomial_sample(trials, probability):
    return sum(1 for _ in range(int(trials)) if random.random() < probability)


def histogram(values, bins=10):
    if not values:
        return []
    low = min(values)
    high = max(values)
    if low == high:
        return [{"label": f"{low:.1f}", "value": len(values)}]
    width = (high - low) / bins
    counts = [0] * bins
    for value in values:
        index = min(bins - 1, int((value - low) / width))
        counts[index] += 1
    return [
        {"label": f"{low + i * width:.1f}-{low + (i + 1) * width:.1f}",
         "value": count}
        for i, count in enumerate(counts)
    ]


def summarize(values, unit):
    avg = sum(values) / len(values)
    return {
        "average": round(avg, 2),
        "minimum": round(min(values), 2),
        "maximum": round(max(values), 2),
        "unit": unit,
    }


def insight(component, summary, extra=None):
    avg = summary["average"]
    extra = extra or {}
    if component == "student-arrivals":
        level = "high" if avg >= 45 else "moderate" if avg >= 25 else "low"
        return f"Arrival pressure is {level}. Add temporary entry guidance if the average rises above 45 students per minute."
    if component == "cafeteria-queues":
        return "Queue risk is high during meal peaks." if avg > 5 else "Service speed is acceptable for normal demand."
    if component == "wifi-failures":
        return "Network reliability needs attention." if avg > 5 else "Failure behavior is within a manageable range."
    if component == "shuttle-waits":
        return "Passengers may perceive the shuttle as slow." if avg > 10 else "Average shuttle waiting time is comfortable."
    if component == "parking-occupancy":
        occupancy = extra.get("occupancy", 0)
        return "Parking is near capacity; overflow planning is recommended." if occupancy > 85 else "Parking availability should remain manageable."
    if component == "classroom-occupancy":
        utilization = extra.get("utilization", 0)
        return "Classrooms are highly utilized; schedule larger rooms for popular sessions." if utilization > 85 else "Classroom utilization is balanced."
    if component == "energy-consumption":
        return "Energy usage is elevated; inspect HVAC and lighting schedules." if avg > 1700 else "Energy use is close to the planning baseline."
    return "Simulation completed."


def simulate(component, params):
    config = COMPONENTS[component]
    values = {key: number(params, key, spec)
              for key, spec in config["fields"].items()}

    if component == "student-arrivals":
        series = [poisson_sample(values["mean"])
                  for _ in range(int(values["periods"]))]
        summary = summarize(series, "students/min")
        chart = [{"label": f"{i + 1}", "value": value}
                 for i, value in enumerate(series)]
        x_label = "Minute"
    elif component == "cafeteria-queues":
        mean = values["mean"]
        series = [random.expovariate(1 / mean)
                  for _ in range(int(values["samples"]))]
        summary = summarize(series, "minutes")
        chart = histogram(series)
        x_label = "Service-time range"
    elif component == "wifi-failures":
        probability = values["probability"]
        series = [binomial_sample(values["devices"], probability)
                  for _ in range(int(values["periods"]))]
        summary = summarize(series, "failures/round")
        chart = [{"label": f"{i + 1}", "value": value}
                 for i, value in enumerate(series)]
        x_label = "Round"
    elif component == "shuttle-waits":
        minimum = min(values["minimum"], values["maximum"])
        maximum = max(values["minimum"], values["maximum"])
        series = [random.uniform(minimum, maximum)
                  for _ in range(int(values["samples"]))]
        summary = summarize(series, "minutes")
        chart = histogram(series)
        x_label = "Wait-time range"
    elif component == "parking-occupancy":
        probability = values["probability"]
        series = [binomial_sample(values["spaces"], probability)
                  for _ in range(int(values["periods"]))]
        summary = summarize(series, "occupied spaces")
        occupancy = round((summary["average"] / values["spaces"]) * 100, 2)
        summary["occupancy"] = occupancy
        chart = [{"label": f"{i + 1}", "value": value}
                 for i, value in enumerate(series)]
        x_label = "Observation"
    elif component == "classroom-occupancy":
        series = [
            clamp(random.gauss(values["mean"],
                  values["stddev"]), 0, values["capacity"])
            for _ in range(int(values["samples"]))
        ]
        summary = summarize(series, "students")
        utilization = round((summary["average"] / values["capacity"]) * 100, 2)
        summary["utilization"] = utilization
        chart = histogram(series)
        x_label = "Attendance range"
    else:
        series = [
            max(0, random.gauss(values["mean"], values["stddev"]))
            for _ in range(int(values["samples"]))
        ]
        summary = summarize(series, "kWh/day")
        chart = [{"label": f"Day {i + 1}", "value": value}
                 for i, value in enumerate(series)]
        x_label = "Day"

    return {
        "component": component,
        "title": config["title"],
        "distribution": config["distribution"],
        "reason": config["reason"],
        "inputs": values,
        "summary": summary,
        "chart": chart,
        "xLabel": x_label,
        "insight": insight(component, summary, summary),
    }


class SmartCampusHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        parsed = urlparse(path)
        if parsed.path in {"/", "/dashboard"}:
            return str(STATIC_DIR / "index.html")
        return str(STATIC_DIR / parsed.path.lstrip("/"))

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/config":
            self.send_json({"components": COMPONENTS})
            return
        if parsed.path == "/api/simulate":
            params = parse_qs(parsed.query)
            component = params.pop("component", [""])[0]
            if component not in COMPONENTS:
                self.send_error(404, "Unknown component")
                return
            self.send_json(simulate(component, params))
            return
        if parsed.path.startswith("/api/simulate/"):
            component = parsed.path.removeprefix("/api/simulate/")
            if component not in COMPONENTS:
                self.send_error(404, "Unknown component")
                return
            self.send_json(simulate(component, parse_qs(parsed.query)))
            return
        super().do_GET()

    def send_json(self, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), SmartCampusHandler)
    print(f"Smart Campus Simulation running at http://127.0.0.1:{PORT}")
    server.serve_forever()
