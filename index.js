
```javascript
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";
import * as fs from "fs";

const client = new Anthropic();
const DATA_FILE = "habits_data.json";
const conversationHistory = [];
let habitsData = {
  habits: [],
  logs: [],
};

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      habitsData = JSON.parse(data);
    }
  } catch (error) {
    console.log("Starting with fresh data...");
  }
}

// Save data to file
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(habitsData, null, 2));
}

// Format data for Claude context
function getDataSummary() {
  const today = new Date().toISOString().split("T")[0];
  const todaysLogs = habitsData.logs.filter((log) => log.date === today);

  const habitStats = habitsData.habits.map((habit) => {
    const habitLogs = habitsData.logs.filter((log) => log.habitId === habit.id);
    const completedDays = new Set(
      habitLogs.map((log) => log.date.substring(0, 7))
    ).size;
    const totalEntries = habitLogs.length;
    const completionRate =
      totalEntries > 0
        ? ((habitLogs.filter((l) => l.completed).length / totalEntries) * 100)
            .toFixed(1)
        : 0;

    return {
      ...habit,
      totalEntries,
      completedDays,
      completionRate: `${completionRate}%`,
      lastLogged: habitLogs.length > 0 ? habitLogs[habitLogs.length - 1].date : "Never",
    };
  });

  return {
    habits: habitStats,
    todaysLogs,
    totalHabits: habitsData.habits.length,
    todaysLogged: todaysLogs.length,
  };
}

// Process user commands
function processCommand(input) {
  const lowerInput = input.toLowerCase().trim();

  if (lowerInput.startsWith("add habit:")) {
    const habitName = input.substring(10).trim();
    if (habitName) {
      const newHabit = {
        id: Date.now().toString(),
        name: habitName,
        createdDate: new Date().toISOString().split("T")[0],
      };
      habitsData.habits.push(newHabit);
      saveData();
      return `✅ Hábito "${habitName}" añadido exitosamente!`;
    }
  }

  if (lowerInput.startsWith("log:")) {
    const parts = input.substring(4).split(" - ");
    if (parts.length >= 2) {
      const habitName = parts[0].trim();
      const status = parts[1].toLowerCase().includes("yes") ||
        parts[1].toLowerCase().includes("completado") ? true : false;

      const habit = habitsData.habits.find((h) =>
        h.name.toLowerCase().includes(habitName.toLowerCase())
      );

      if (habit) {
        const today = new Date().toISOString().split("T")[0];
        const logEntry = {
          habitId: habit.id,
          date: today,
          completed: status,
          timestamp: new Date().toISOString(),
        };
        habitsData.logs.push(logEntry);
        saveData();
        return `✅ Registro de "${habit.name}" como ${status ? "completado" : "no completado"}`;
      }
      return "❌ Hábito no encontrado";
    }
  }

  if (lowerInput === "list" || lowerInput === "listar") {
    const habits = habitsData.habits;
    if (habits.length === 0) {
      return "No tienes hábitos registrados aún.";
    }
    return (
      "Tus hábitos:\n" + habits.map((h, i) => `${i + 1}. ${h.name}`).join("\n")
    );
  }

  if (
    lowerInput === "stats" ||
    lowerInput === "estadísticas" ||
    lowerInput === "estadisticas"
  ) {
    const summary = getDataSummary();
    if (summary.habits.length === 0) {
      return "No hay hábitos para mostrar estadísticas.";
    }

    let statsText = `📊 Estadísticas de Hábitos\n${"=".repeat(40)}\n`;
    statsText += `Total de hábitos: ${summary.totalHabits}\n`;
    statsText += `Registros hoy: ${summary.todaysLogged}\n\n`;

    summary.habits.forEach((habit) => {
      statsText += `📌 ${habit.name}\n`;
      statsText += `   Tasa de compleción: ${habit.completionRate}\n`;
      statsText += `   Registros totales: ${habit.totalEntries}\n`;
      statsText += `   Último registro: ${habit.lastLogged}\n\n`;
    });

    return statsText;
  }

  if (lowerInput === "help" || lowerInput === "ayuda") {
    return `Comandos disponibles:
- add habit: [nombre] - Añadir un nuevo hábito
- log: [hábito] - [yes/no] - Registrar un hábito completado o no
- list - Listar todos los hábitos
- stats - Ver estadísticas detalladas
- help - Mostrar esta ayuda
O simplemente escribe cualquier pregunta sobre tus hábitos.`;
  }

  return null;