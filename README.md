# AI-Based Smart Campus Simulation System

This project simulates common campus operations with probability distributions.
It includes a homepage and a dashboard with seven interactive tabs.

## Components

| Dashboard tab | Distribution | Purpose |
| --- | --- | --- |
| Student arrivals | Poisson | Counts arrivals per minute |
| Cafeteria queues | Exponential | Models service and waiting times |
| WiFi failures | Binomial | Models success/failure outcomes |
| Shuttle bus waiting times | Uniform | Models waits in a fixed range |
| Parking occupancy | Binomial | Models occupied or available spaces |
| Classroom occupancy | Normal | Models attendance around an average |
| Campus energy consumption | Normal | Models daily energy use around a mean |

## Run

```bash
python3 app.py
```

Open:

```text
http://127.0.0.1:8000
```

The dashboard lets you modify assumptions, run simulations, view summary
statistics, read an AI-style operational insight, and inspect one graph per
campus component.
