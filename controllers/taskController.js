import Task from "../models/taskModel.js";
import Group from "../models/groupModel.js";


// 🟢 CREATE TASK
export const createTask = async (req, res) => {
  try {
    const { taskName, groupId, dueDate } = req.body;

    if (!taskName || !groupId) {
      return res.status(400).json({
        message: "taskName and groupId are required",
      });
    }

    const groupExists = await Group.findById(groupId);
    if (!groupExists) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const newTask = await Task.create({
      taskName,
      group: groupId,
      dueDate,
    });

    res.status(201).json({
      message: "Task created",
      task: newTask,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error creating task",
      error: error.message,
    });
  }
};



// 🔵 GET ALL TASKS
export const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate("group", "name")
      .sort({ createdAt: -1 });

    res.json(tasks);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching tasks",
      error: error.message,
    });
  }
};



// 🟡 GET TASKS BY GROUP
export const getTasksByGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const tasks = await Task.find({ group: groupId })
      .populate("group", "name");

    res.json(tasks);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching group tasks",
      error: error.message,
    });
  }
};



// 🟣 UPDATE TASK (name, group, dueDate, etc.)
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { taskName, groupId, dueDate, completed } = req.body;

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      {
        ...(taskName && { taskName }),
        ...(groupId && { group: groupId }),
        ...(dueDate && { dueDate }),
        ...(completed !== undefined && { completed }),
      },
      { new: true }
    ).populate("group", "name");

    if (!updatedTask) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    res.json(updatedTask);

  } catch (error) {
    res.status(500).json({
      message: "Error updating task",
      error: error.message,
    });
  }
};



// 🟤 TOGGLE COMPLETE (quick action)
export const toggleTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    task.completed = !task.completed;
    await task.save();

    res.json(task);

  } catch (error) {
    res.status(500).json({
      message: "Error toggling task",
      error: error.message,
    });
  }
};



// 🔴 DELETE TASK
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Task.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    res.json({
      message: "Task deleted",
    });

  } catch (error) {
    res.status(500).json({
      message: "Error deleting task",
      error: error.message,
    });
  }
};



// 🟠 GET TODAY / OVERDUE TASKS (for dashboard)
export const getTodayTasks = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const tasks = await Task.find({
      dueDate: {
        $gte: today,
        $lt: tomorrow,
      },
    }).populate("group", "name");

    res.json(tasks);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching today's tasks",
      error: error.message,
    });
  }
};