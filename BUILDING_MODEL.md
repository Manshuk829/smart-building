# Building Model Specifications

## 🏗️ Building Type: Shoe Rack Model

The smart building system is modeled as a **shoe rack** for demonstration purposes.

## 📐 Dimensions

- **Total Building Dimensions**: 17D × 15W × 15H **centimeters**
- **Unit**: All measurements are in **centimeters (cm)**
- **Floors**: 4 floors total
  - Each base/shelf of the shoe rack = 1 floor
  - Floor 1 = Bottom shelf/base
  - Floor 2 = Second shelf
  - Floor 3 = Third shelf
  - Floor 4 = Top shelf

## 🏢 Floor Structure

- **4 Floors**: Each shelf/base represents one floor
- **4 Blocks/Sections**: Per floor
- **4 Nodes**: Flame sensor nodes per floor
- **Height per Floor**: 15 cm (vertical spacing between shelves)

## 🗺️ Pathfinding Scale

Since the building is modeled in centimeters:

- **Distance Calculations**: All in centimeters
- **Movement Speed**: ~1 cm/second (for small scale model)
- **Time Calculations**: 
  - 1 cm distance ≈ 0.1 seconds
  - Vertical movement (between floors): 15 cm per floor
- **Connection Radius**: 6 cm (nodes connect within 6 cm)
- **Hazard Radius**: 4 cm (hazards affect nodes within 4 cm)

## 📍 Node Layout (per floor)

### Exits (4 per floor)
- Exit 1: (0, 0) cm
- Exit 2: (0, 15) cm
- Exit 3: (17, 0) cm
- Exit 4: (17, 15) cm

### Staircases (4 per floor)
- Staircase 1: (4, 4) cm
- Staircase 2: (4, 11) cm
- Staircase 3: (13, 4) cm
- Staircase 4: (13, 11) cm

### Elevators (2 per floor)
- Elevator 1: (8, 7) cm
- Elevator 2: (9, 8) cm

### Regular Nodes
- Grid density: 3×3 per block
- Total: ~36 regular nodes per floor
- Distributed across 4 blocks

## 🔄 Vertical Movement

- **Between Floors**: Staircases connect vertically
- **Vertical Distance**: 15 cm per floor
- **Weight Calculation**: `verticalDistance * 0.1` (converts cm to time weight)

## ⚠️ Important Notes

1. **Scale**: All dimensions are in **centimeters**, not meters
2. **Model Type**: Shoe rack (each shelf = one floor)
3. **Pathfinding**: A* algorithm optimized for centimeter-scale distances
4. **Time Estimates**: Adjusted for small-scale model movement speeds

## 🎯 Use Cases

This centimeter-scale model is perfect for:
- **Demonstration**: Physical shoe rack with sensors
- **Testing**: Small-scale IoT sensor deployment
- **Education**: Final Year Project demonstration
- **Prototyping**: Before scaling to full-size buildings

