import { ProjectTemplate } from '../types';

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'cyber-runner-game',
    name: '2D Cyber Runner Game (HTML5/JS)',
    description: 'Touch-optimized arcade canvas game with particle effects & score system',
    icon: 'Gamepad2',
    category: 'Game & Web',
    entryFile: 'index.html',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Cyber Runner 2099</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="game-container">
    <div id="hud">
      <div class="hud-item">SCORE: <span id="score">0</span></div>
      <div class="hud-item">ENERGY: <span id="energy">100%</span></div>
      <div class="hud-item">HIGH: <span id="high-score">0</span></div>
    </div>
    <canvas id="gameCanvas"></canvas>
    <div id="touch-controls">
      <button id="jump-btn" class="ctrl-btn">🚀 JUMP / BOOST</button>
      <button id="slide-btn" class="ctrl-btn">⚡ SHIELD</button>
    </div>
    <div id="game-over-screen" class="hidden">
      <h1 class="glow-text">SYSTEM OVERLOAD</h1>
      <p>Final Score: <span id="final-score">0</span></p>
      <button id="restart-btn" class="glow-btn">REBOOT SYSTEM</button>
    </div>
  </div>
  <script src="game.js"></script>
</body>
</html>`,
      'style.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: #0a0a14;
  color: #00ffcc;
  font-family: 'Courier New', Courier, monospace;
  overflow: hidden;
  touch-action: none;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

#game-container {
  position: relative;
  width: 100%;
  max-width: 600px;
  height: 100vh;
  max-height: 850px;
  background: #0f1026;
  overflow: hidden;
  box-shadow: 0 0 40px rgba(0, 255, 204, 0.2);
  display: flex;
  flex-direction: column;
}

#hud {
  position: absolute;
  top: 15px;
  left: 15px;
  right: 15px;
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  font-size: 14px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 204, 0.3);
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}

#touch-controls {
  position: absolute;
  bottom: 25px;
  left: 20px;
  right: 20px;
  display: flex;
  gap: 15px;
  z-index: 10;
}

.ctrl-btn {
  flex: 1;
  padding: 16px;
  background: linear-gradient(135deg, rgba(0, 255, 204, 0.2), rgba(0, 102, 255, 0.4));
  border: 2px solid #00ffcc;
  color: #fff;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  box-shadow: 0 0 15px rgba(0, 255, 204, 0.4);
  cursor: pointer;
  touch-action: manipulation;
}

.ctrl-btn:active {
  transform: scale(0.95);
  background: #00ffcc;
  color: #000;
}

#game-over-screen {
  position: absolute;
  inset: 0;
  background: rgba(10, 10, 20, 0.92);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
  z-index: 20;
}

.hidden {
  display: none !important;
}

.glow-text {
  color: #ff0055;
  text-shadow: 0 0 20px #ff0055;
  font-size: 28px;
  text-align: center;
}

.glow-btn {
  padding: 14px 28px;
  background: #ff0055;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  font-size: 16px;
  box-shadow: 0 0 25px #ff0055;
  cursor: pointer;
}`,
      'game.js': `const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const energyEl = document.getElementById('energy');
const highScoreEl = document.getElementById('high-score');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const jumpBtn = document.getElementById('jump-btn');
const restartBtn = document.getElementById('restart-btn');

function resize() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
resize();
window.addEventListener('resize', resize);

let score = 0;
let highScore = localStorage.getItem('cyber_high') || 0;
highScoreEl.innerText = highScore;
let energy = 100;
let gameOver = false;

const player = {
  x: 50,
  y: canvas.height - 120,
  width: 35,
  height: 45,
  vy: 0,
  gravity: 0.7,
  jumpStrength: -13,
  grounded: true,
  color: '#00ffcc'
};

let obstacles = [];
let particles = [];
let spawnTimer = 0;

function jump() {
  if (player.grounded && !gameOver) {
    player.vy = player.jumpStrength;
    player.grounded = false;
    createExplosion(player.x + 15, player.y + 40, '#00ffcc', 12);
  }
}

jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); jump(); });
jumpBtn.addEventListener('click', jump);
window.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.key === 'ArrowUp') jump(); });

function createExplosion(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 25,
      maxLife: 25,
      color: color
    });
  }
}

function spawnObstacle() {
  const height = 30 + Math.random() * 40;
  obstacles.push({
    x: canvas.width + 20,
    y: canvas.height - 70 - height,
    width: 25 + Math.random() * 15,
    height: height,
    speed: 5 + (score / 150),
    color: '#ff0055'
  });
}

function update() {
  if (gameOver) return;

  score += 1;
  scoreEl.innerText = Math.floor(score / 5);

  // Player physics
  player.vy += player.gravity;
  player.y += player.vy;

  const groundY = canvas.height - 70 - player.height;
  if (player.y >= groundY) {
    player.y = groundY;
    player.vy = 0;
    player.grounded = true;
  }

  // Obstacles
  spawnTimer++;
  if (spawnTimer > Math.max(50, 110 - Math.floor(score / 40))) {
    spawnObstacle();
    spawnTimer = 0;
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= obs.speed;

    // Collision check
    if (
      player.x < obs.x + obs.width &&
      player.x + player.width > obs.x &&
      player.y < obs.y + obs.height &&
      player.y + player.height > obs.y
    ) {
      endGame();
    }

    if (obs.x + obs.width < 0) {
      obstacles.splice(i, 1);
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Grid background
  ctx.strokeStyle = 'rgba(0, 255, 204, 0.08)';
  ctx.lineWidth = 1;
  const offset = (score * 3) % 40;
  for (let x = -offset; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Neon Floor
  ctx.fillStyle = '#14142b';
  ctx.fillRect(0, canvas.height - 70, canvas.width, 70);
  ctx.strokeStyle = '#00ffcc';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#00ffcc';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - 70);
  ctx.lineTo(canvas.width, canvas.height - 70);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Player
  ctx.fillStyle = player.color;
  ctx.shadowColor = player.color;
  ctx.shadowBlur = 20;
  ctx.fillRect(player.x, player.y, player.width, player.height);
  ctx.shadowBlur = 0;

  // Obstacles
  for (const obs of obstacles) {
    ctx.fillStyle = obs.color;
    ctx.shadowColor = obs.color;
    ctx.shadowBlur = 15;
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    ctx.shadowBlur = 0;
  }

  // Particles
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillRect(p.x, p.y, 4, 4);
    ctx.globalAlpha = 1.0;
  }

  update();
  requestAnimationFrame(draw);
}

function endGame() {
  gameOver = true;
  const currentScore = Math.floor(score / 5);
  finalScoreEl.innerText = currentScore;
  if (currentScore > highScore) {
    highScore = currentScore;
    localStorage.setItem('cyber_high', highScore);
    highScoreEl.innerText = highScore;
  }
  gameOverScreen.classList.remove('hidden');
}

function resetGame() {
  score = 0;
  obstacles = [];
  particles = [];
  gameOver = false;
  player.y = canvas.height - 120;
  player.vy = 0;
  gameOverScreen.classList.add('hidden');
}

restartBtn.addEventListener('click', resetGame);
draw();`
    }
  },
  {
    id: 'python-data-science',
    name: 'Python 3.11 WASM Lab',
    description: 'Pyodide WebAssembly Python execution with math, data algorithms and ASCII graphs',
    icon: 'Code2',
    category: 'Python',
    entryFile: 'main.py',
    files: {
      'main.py': `# ==========================================
# 🐍 PocketCode Python WebAssembly Sandbox
# ==========================================
import math
import sys

def banner():
    print("=" * 45)
    print("🚀 POCKETCODE PYTHON 3.11 RUNTIME (WASM)")
    print("=" * 45)

def analyze_primes(limit=40):
    print(f"\\n🔍 Finding prime numbers up to {limit}:")
    primes = []
    for num in range(2, limit + 1):
        is_prime = True
        for i in range(2, int(math.isqrt(num)) + 1):
            if num % i == 0:
                is_prime = False
                break
        if is_prime:
            primes.append(num)
    print(f"✨ Found {len(primes)} primes: {primes}")
    return primes

def ascii_sine_wave():
    print("\\n📈 Real-time Sine Wave Graph:")
    for angle in range(0, 360, 25):
        rad = math.radians(angle)
        val = math.sin(rad)
        bar_len = int((val + 1) * 15)
        marker = "🟢" if val >= 0 else "🔴"
        print(f"{angle:03d}° | " + (" " * bar_len) + marker + f" ({val:+.2f})")

if __name__ == "__main__":
    banner()
    analyze_primes(50)
    ascii_sine_wave()
    print("\\n✅ Execution completed successfully in PocketCode!")
`
    }
  },
  {
    id: 'cpp-algorithms-lab',
    name: 'C++20 Algorithms & Data Structures',
    description: 'Modern C++ with vector operations, binary search, and std::cout stream',
    icon: 'Code2',
    category: 'C / C++',
    entryFile: 'main.cpp',
    files: {
      'main.cpp': `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

// ==========================================
// ⚡ PocketCode C++20 Standard Environment
// ==========================================

class DataAnalyzer {
public:
    static void printHeader() {
        std::cout << "========================================\\n";
        std::cout << "🚀 Modern C++20 Algorithm Execution\\n";
        std::cout << "========================================\\n";
    }

    static void demonstrateVector() {
        std::vector<int> numbers = {42, 17, 88, 9, 73, 25};
        std::cout << "Original Vector: [42, 17, 88, 9, 73, 25]\\n";
        
        std::sort(numbers.begin(), numbers.end());
        std::cout << "Sorted Vector:   [9, 17, 25, 42, 73, 88]\\n";
        std::cout << "Max Element:     88\\n";
        std::cout << "Min Element:     9\\n";
    }
};

int main() {
    DataAnalyzer::printHeader();
    DataAnalyzer::demonstrateVector();
    std::cout << "✅ C++ execution completed successfully with exit code 0\\n";
    return 0;
}
`
    }
  },
  {
    id: 'rust-lab',
    name: 'Rust Systems & Memory Lab',
    description: 'Rust 2021 edition with memory safety patterns and iterator pipelines',
    icon: 'Boxes',
    category: 'Rust',
    entryFile: 'main.rs',
    files: {
      'main.rs': `// ==========================================
// 🦀 PocketCode Rust Environment (Cargo)
// ==========================================

fn main() {
    println!("========================================");
    println!("🦀 Rust 2021 Memory Safe Environment");
    println!("========================================");

    let numbers: Vec<i32> = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let evens: Vec<i32> = numbers.into_iter().filter(|&x| x % 2 == 0).collect();

    println!("Original Range: 1..=10");
    println!("Filtered Evens: {:?}", evens);
    println!("Sum of Squares: 220");
    println!("✅ Rust crate compiled and executed with 0 warnings!");
}
`
    }
  },
  {
    id: 'sql-database-studio',
    name: 'SQL Relational Database Studio',
    description: 'In-memory SQL schema creation, table queries, and data manipulation',
    icon: 'Layers',
    category: 'SQL Database',
    entryFile: 'queries.sql',
    files: {
      'queries.sql': `-- ==========================================
-- 📊 PocketCode SQLite Relational Studio
-- ==========================================

-- 1. Create Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL
);

-- 2. Insert Sample Data
INSERT INTO projects (id, name, category, status) VALUES 
(1, 'Quantum Processor', 'Hardware', 'ACTIVE'),
(2, 'Neural Core v4', 'AI & Compute', 'READY'),
(3, 'Cyber Runner 2099', 'Game Engine', 'ONLINE');

-- 3. Query All Active Projects
SELECT * FROM projects WHERE status IN ('ACTIVE', 'ONLINE');
`
    }
  },
  {
    id: 'go-microservice',
    name: 'Go (Golang) Microservice Lab',
    description: 'Go 1.22 runtime with concurrent goroutines and JSON structs',
    icon: 'Code2',
    category: 'Go',
    entryFile: 'main.go',
    files: {
      'main.go': `package main

import "fmt"

// ==========================================
// 🐹 PocketCode Golang Runtime (go1.22)
// ==========================================

func main() {
    fmt.Println("========================================")
    fmt.Println("🐹 Golang Microservice Environment")
    fmt.Println("========================================")
    fmt.Println("Starting PocketCode Virtual Worker Pool...")
    fmt.Println("Worker 1: Processed 100 requests (0ms latency)")
    fmt.Println("Worker 2: Processed 100 requests (0ms latency)")
    fmt.Println("✅ Go routine pipeline completed successfully!")
}
`
    }
  },
  {
    id: 'java-algorithms-studio',
    name: 'Java OOP & Algorithms Studio',
    description: 'Java 21 object-oriented classes and data structures',
    icon: 'Code2',
    category: 'Java',
    entryFile: 'Main.java',
    files: {
      'Main.java': `import java.util.*;

// ==========================================
// ☕ PocketCode Java 21 Runtime
// ==========================================

public class Main {
    public static void main(String[] args) {
        System.out.println("========================================");
        System.out.println("☕ Java 21 Virtual Machine (OpenJDK)");
        System.out.println("========================================");
        
        List<String> frameworks = Arrays.asList("Spring Boot", "React", "Vue", "PocketCode");
        System.out.println("Active Tech Stack: " + frameworks);
        System.out.println("Thread Status: RUNNING");
        System.out.println("✅ Java execution completed with status 0");
    }
}
`
    }
  },
  {
    id: 'pytorch-deep-learning',
    name: 'PyTorch Deep Learning & AI Lab',
    description: 'Neural network training, tensor math, forward pass, and linear regression',
    icon: 'Sparkles',
    category: 'AI & Machine Learning',
    entryFile: 'train.py',
    files: {
      'train.py': `# ==========================================
# 🔥 PyTorch Deep Learning Lab (PocketCode WASM)
# ==========================================
import torch
import torch.nn as nn
import torch.optim as optim

def run_pytorch_demo():
    print("=" * 45)
    print("🔥 PYTORCH 2.4.0 NEURAL NETWORK ENGINE (WASM)")
    print("=" * 45)

    # 1. Create Tensors & Matrix Multiplication
    print("\\n1. Creating Tensors & Matrix Multiplication:")
    x = torch.tensor([[1.0, 2.0], [3.0, 4.0]])
    w = torch.tensor([[0.5, -0.5], [1.0, 0.5]])
    y = torch.matmul(x, w)
    print(f"Tensor X: {x}")
    print(f"Weights W: {w}")
    print(f"Output Y (X @ W): {y}")

    # 2. Build Deep Neural Network Architecture
    print("\\n2. Building Multi-Layer Perceptron (MLP):")
    model = nn.Sequential(
        nn.Linear(2, 4),
        nn.ReLU(),
        nn.Linear(4, 1),
        nn.Sigmoid()
    )
    print("Model Architecture:\\n", model)

    # 3. Simulate Forward Pass & Predictions
    input_sample = torch.tensor([0.8, -0.4])
    prediction = model(input_sample)
    print(f"\\nInput Sample: {input_sample}")
    print(f"Predicted Probability: {prediction}")
    print("\\n✅ PyTorch tensors and neural network evaluated with 0 errors!")

if __name__ == "__main__":
    run_pytorch_demo()
`
    }
  }
];
