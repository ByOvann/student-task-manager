
import type { Task } from '@/components/TaskCard';

type TaskAction =
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'TOGGLE_STATUS'; payload: string }
  | { type: 'RESET_TASKS' };

export function taskReducer(
  state: Task[],
  action: TaskAction
): Task[] {
  switch (action.type) {
    case 'ADD_TASK':
      return [action.payload, ...state];

    case 'DELETE_TASK':
      return state.filter(
        task => task.id !== action.payload
      );

    case 'TOGGLE_STATUS':
      return state.map(task =>
        task.id === action.payload
          ? { ...task, completed: !task.completed }
          : task
      );

    case 'RESET_TASKS':
      return [];

    default:
      return state;
  }
}
