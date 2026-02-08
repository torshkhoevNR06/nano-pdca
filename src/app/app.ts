import { Component, OnInit, OnDestroy, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  // --- SIGNALS (STATE) ---
  activeTab = signal<'active' | 'plan' | 'archive'>('active');
  cycles = signal<Cycle[]>([]);
  now = signal<Date>(new Date());
  
  // Temporary state for forms
  newCycle = {
    title: '',
    hypothesis: '',
    category: 'Религия',
    duration: 3,
    startDate: this.getCurrentDateTimeLocal()
  };

  checkForm: Record<string, CycleResult> = {};
  private timerId: any;

  // --- COMPUTED SIGNALS ---
  activeCycles = computed(() => this.cycles().filter(c => c.status === 'active'));
  completedCycles = computed(() => this.cycles().filter(c => c.status === 'completed').reverse());

  constructor() {
    effect(() => {
      localStorage.setItem('nano_pdca_cycles', JSON.stringify(this.cycles()));
    });
  }

  ngOnInit() {
    const saved = localStorage.getItem('nano_pdca_cycles');
    if (saved) {
      try {
        this.cycles.set(JSON.parse(saved));
        this.cycles().forEach(c => {
          if (!this.checkForm[c.id]) {
            this.initCheckForm(c.id);
          }
        });
      } catch (e) {
        console.error('Error loading data', e);
      }
    }

    // Start Timer to update 'now' every second
    this.timerId = setInterval(() => {
      this.now.set(new Date());
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  // --- ACTIONS ---

  createCycle() {
    const start = new Date(this.newCycle.startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + this.newCycle.duration);

    const cycle: Cycle = {
      id: crypto.randomUUID(),
      title: this.newCycle.title,
      hypothesis: this.newCycle.hypothesis,
      category: this.newCycle.category,
      duration: this.newCycle.duration,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: 'active',
      phase: 'Do',
      results: null,
      finalDecision: null
    };

    this.cycles.update(list => [...list, cycle]);
    this.initCheckForm(cycle.id);
    
    // Reset form
    this.newCycle = { 
      title: '', 
      hypothesis: '', 
      category: 'Зависимость', 
      duration: 3,
      startDate: this.getCurrentDateTimeLocal()
    };
    this.activeTab.set('active');
  }

  // --- TIMER LOGIC ---

  getCountdown(cycle: Cycle): string {
    const now = this.now().getTime();
    const start = new Date(cycle.startDate).getTime();
    const end = new Date(cycle.endDate).getTime();

    // If future start
    if (now < start) {
       const diff = start - now;
       return this.formatDuration(diff);
    }

    const diff = end - now;
    if (diff <= 0) return '00д 00ч 00м 00с';

    return this.formatDuration(diff);
  }

  formatDuration(ms: number): string {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${days}д ${hours}ч ${minutes}м ${seconds}с`;
  }

  isFuture(cycle: Cycle): boolean {
    return this.now().getTime() < new Date(cycle.startDate).getTime();
  }

  isTimeUp(cycle: Cycle): boolean {
    const end = new Date(cycle.endDate).getTime();
    return this.now().getTime() >= end;
  }

  getProgress(cycle: Cycle): number {
    const total = cycle.duration * 24 * 60 * 60 * 1000;
    const end = new Date(cycle.endDate).getTime();
    const now = this.now().getTime();
    const left = end - now;
    const elapsed = total - left;
    const percent = (elapsed / total) * 100;
    return Math.max(0, Math.min(100, percent));
  }

  moveToCheck(cycle: Cycle) {
    this.updateCycle(cycle.id, { phase: 'Check' });
  }

  submitCheck(cycle: Cycle) {
    const result = this.checkForm[cycle.id];
    this.updateCycle(cycle.id, { 
      phase: 'Act', 
      results: result 
    });
  }

  finalizeAct(cycle: Cycle, decision: 'Adopted' | 'Adjusted' | 'Abandoned') {
    this.updateCycle(cycle.id, { 
      status: 'completed', 
      finalDecision: decision 
    });
    
    if (decision === 'Adjusted') {
      alert('Данные сохранены в архив. Теперь создай новый цикл с учетом этих данных!');
      this.activeTab.set('plan');
    }
  }

  deleteCycle(id: string) {
    if (confirm('Удалить запись из архива?')) {
      this.cycles.update(list => list.filter(c => c.id !== id));
    }
  }

  // --- HELPERS ---

  private getCurrentDateTimeLocal(): string {
    const now = new Date();
    // Adjust for timezone to get local ISO string format correct for input
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  private updateCycle(id: string, changes: Partial<Cycle>) {
    this.cycles.update(list => 
      list.map(c => c.id === id ? { ...c, ...changes } : c)
    );
  }

  private initCheckForm(id: string) {
    this.checkForm[id] = {
      successLevel: 'Частично',
      worked: '',
      failed: '',
      insight: ''
    };
  }

  countDecision(type: string) {
    return this.completedCycles().filter(c => c.finalDecision === type).length;
  }
}