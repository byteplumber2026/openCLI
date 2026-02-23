// src/cli/history.ts
export class CommandHistory {
  private history: string[] = [];
  private maxSize: number;
  private currentIndex: number = -1;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  add(command: string): void {
    const trimmed = command.trim();
    if (!trimmed) return;

    const lastCommand = this.history[this.history.length - 1];
    if (lastCommand === trimmed) return;

    this.history.push(trimmed);
    if (this.history.length > this.maxSize) {
      this.history.shift();
    }

    this.resetNavigation();
  }

  getHistory(): string[] {
    return [...this.history];
  }

  navigateUp(): string {
    if (this.history.length === 0) return "";

    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
    }

    return this.history[this.history.length - 1 - this.currentIndex] || "";
  }

  navigateDown(): string {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.history.length - 1 - this.currentIndex] || "";
    }

    this.currentIndex = -1;
    return "";
  }

  resetNavigation(): void {
    this.currentIndex = -1;
  }
}
